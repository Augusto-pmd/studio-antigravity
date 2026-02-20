'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import type { Expense } from '@/lib/types';
import { expenseCategories } from '@/lib/data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { format as formatDateFns, parseISO } from 'date-fns';

const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(
    amount
  );
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
};

const formatPercentage = (value: number) => {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

type Summary = {
  [categoryId: string]: {
    name: string;
    totalARS: number;
    totalUSD: number;
  };
};

export function ProjectExpenseSummary({
  expenses,
  totalProjectCostARS,
  suppliersMap,
}: {
  expenses: Expense[];
  totalProjectCostARS: number;
  suppliersMap: Record<string, string>;
}) {
  const summary = useMemo((): Summary => {
    if (!expenses || expenses.length === 0) return {};

    const initialSummary: Summary = {};

    return expenses.reduce((acc, expense) => {
      const categoryId = expense.categoryId || 'CAT-12'; // Default to "Otros"
      const category = expenseCategories.find((c) => c.id === categoryId);
      const categoryName = category ? category.name : 'Otros';

      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: categoryName,
          totalARS: 0,
          totalUSD: 0,
        };
      }

      const exchangeRate = expense.exchangeRate || 1;

      if (expense.currency === 'USD') {
        acc[categoryId].totalUSD += expense.amount;
        acc[categoryId].totalARS += expense.amount * exchangeRate;
      } else {
        // ARS
        acc[categoryId].totalARS += expense.amount;
        if (exchangeRate > 0) { // check to avoid division by zero
          acc[categoryId].totalUSD += expense.amount / exchangeRate;
        }
      }

      return acc;
    }, initialSummary);
  }, [expenses]);

  const summaryArray = useMemo(
    () =>
      Object.entries(summary)
        .map(([categoryId, data]) => ({
          categoryId,
          ...data,
        }))
        .sort((a, b) => b.totalARS - a.totalARS),
    [summary]
  );

  // Lógica macro para analizar "Fugas" en este proyecto
  const { totalDirect, totalOperative, operativeRatio } = useMemo(() => {
    let opt = 0;
    let dir = 0;
    const operativeIds = ['CAT-13', 'CAT-09', 'CAT-07', 'CAT-10', 'CAT-11', 'CAT-04', 'CAT-15', 'CAT-12'];

    summaryArray.forEach((item: { categoryId: string, name: string, totalARS: number, totalUSD: number }) => {
      if (operativeIds.includes(item.categoryId)) opt += item.totalARS;
      else dir += item.totalARS;
    });

    const absTotal = opt + dir;
    return {
      totalDirect: dir,
      totalOperative: opt,
      operativeRatio: absTotal > 0 ? (opt / absTotal) * 100 : 0
    }
  }, [summaryArray]);

  const COLORS = ['#3b82f6', '#ef4444'];
  const macroData = [
    { name: 'Costo Directo (Materiales/MO)', value: totalDirect, fill: '#3b82f6' },
    { name: 'Gastos Operativos (Fugas)', value: totalOperative, fill: '#ef4444' }
  ];

  return (
    <div className="space-y-4">
      {summaryArray.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Macro-Análisis de Costo</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value, 'ARS')} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center text-center p-6 border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Sangría Operativa de la Obra</p>
              <div className={cn("text-5xl font-black", operativeRatio > 25 ? "text-red-500" : "text-amber-500")}>
                {operativeRatio.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                De la inversión de esta Obra son pequeños gastos de Nafta, Viáticos y Operatividad.
              </p>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos por Rubro</CardTitle>
          <CardDescription>
            Desglose de todos los costos imputados a esta obra, y su incidencia sobre el costo total. Haga clic en un rubro para ver el detalle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {summaryArray.length === 0 ? (
              <div className="text-center text-muted-foreground p-4">
                No hay gastos para esta obra.
              </div>
            ) : (
              summaryArray.map((item: { categoryId: string, name: string, totalARS: number, totalUSD: number }) => {
                const proportion =
                  totalProjectCostARS > 0
                    ? (item.totalARS / totalProjectCostARS) * 100
                    : 0;
                return (
                  <AccordionItem value={item.name} key={item.name} className="border-b">
                    <AccordionTrigger className="hover:no-underline p-4 font-normal">
                      <div className="flex w-full items-center justify-between gap-4 text-sm">
                        <div className="w-[40%] font-medium">
                          <div>{item.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={proportion} className="h-2 w-20" />
                            <span className="text-xs text-muted-foreground">{formatPercentage(proportion)}</span>
                          </div>
                        </div>
                        <div className="w-[30%] text-right font-mono">
                          {formatCurrency(item.totalUSD, 'USD')}
                        </div>
                        <div className="w-[30%] text-right font-mono font-bold">
                          {formatCurrency(item.totalARS, 'ARS')}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 bg-muted/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses
                            .filter(
                              (e) => (e.categoryId || 'CAT-12') === item.categoryId
                            )
                            .map((expense) => {
                              return (
                                <TableRow key={expense.id} className="text-xs">
                                  <TableCell>{formatDate(expense.date)}</TableCell>
                                  <TableCell>
                                    <div className='font-medium'>{suppliersMap[expense.supplierId] || expense.supplierId}</div>
                                    {expense.description && <div className='text-muted-foreground'>{expense.description}</div>}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    <div>{formatCurrency(expense.amount, expense.currency)}</div>
                                    {expense.exchangeRate > 0 && (
                                      <div className="text-muted-foreground text-xs">
                                        {expense.currency === 'ARS'
                                          ? `(${formatCurrency(expense.amount / expense.exchangeRate, 'USD')})`
                                          : `(${formatCurrency(expense.amount * expense.exchangeRate, 'ARS')})`}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })
            )}
          </Accordion>

          <div className="mt-6 border-t pt-4">
            <div className="flex w-full items-center justify-between gap-4 text-sm font-bold">
              <div className="w-[40%] text-lg">Total General</div>
              <div className="w-[30%] text-right font-mono text-lg">
                {formatCurrency(summaryArray.reduce((acc: number, item: { totalUSD: number }) => acc + item.totalUSD, 0), 'USD')}
              </div>
              <div className="w-[30%] text-right font-mono text-lg">
                {formatCurrency(summaryArray.reduce((acc: number, item: { totalARS: number }) => acc + item.totalARS, 0), 'ARS')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
