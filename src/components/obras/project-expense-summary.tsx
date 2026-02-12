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

const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(
    amount
  );
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

export function ProjectExpenseSummary({ expenses, totalProjectCostARS }: { expenses: Expense[], totalProjectCostARS: number }) {

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
    () => Object.values(summary).sort((a, b) => b.totalARS - a.totalARS),
    [summary]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Gastos por Rubro</CardTitle>
        <CardDescription>
          Desglose de todos los costos imputados a esta obra, y su incidencia sobre el costo total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Rubro</TableHead>
                <TableHead className="text-right">Total en USD</TableHead>
                <TableHead className="text-right">Total en ARS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay gastos para esta obra.
                  </TableCell>
                </TableRow>
              ) : (
                summaryArray.map((item) => {
                  const proportion = totalProjectCostARS > 0 ? (item.totalARS / totalProjectCostARS) * 100 : 0;
                  return (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={proportion} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{formatPercentage(proportion)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.totalUSD, 'USD')}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(item.totalARS, 'ARS')}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
