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
import type { Expense } from '@/lib/types';
import { expenseCategories } from '@/lib/data';

const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(
    amount
  );
};

type Summary = {
  [categoryId: string]: {
    name: string;
    totalARS: number;
    totalUSD: number;
  };
};

export function ProjectExpenseSummary({ expenses }: { expenses: Expense[] }) {
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

      if (expense.currency === 'USD') {
        acc[categoryId].totalUSD += expense.amount;
        acc[categoryId].totalARS += expense.amount * (expense.exchangeRate || 1);
      } else {
        // ARS
        acc[categoryId].totalARS += expense.amount;
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
          Desglose de todos los costos imputados a esta obra, incluyendo gastos
          directos, mano de obra y horas de oficina.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rubro</TableHead>
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
                summaryArray.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.totalUSD, 'USD')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(item.totalARS, 'ARS')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
