'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
        if (exchangeRate > 1) {
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

  return (
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
            summaryArray.map((item) => {
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
                          <TableHead className="text-right">Monto (ARS)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses
                          .filter(
                            (e) => (e.categoryId || 'CAT-12') === item.categoryId
                          )
                          .map((expense) => {
                            const amountInARS = expense.currency === 'USD' ? expense.amount * expense.exchangeRate : expense.amount;
                            return (
                                <TableRow key={expense.id} className="text-xs">
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>
                                        <div className='font-medium'>{suppliersMap[expense.supplierId] || expense.supplierId}</div>
                                        {expense.description && <div className='text-muted-foreground'>{expense.description}</div>}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(amountInARS, 'ARS')}</TableCell>
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
      </CardContent>
    </Card>
  );
}
