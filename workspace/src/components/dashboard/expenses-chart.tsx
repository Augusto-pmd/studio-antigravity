"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useCollection, useFirestore } from "@/firebase";
import { useMemo } from "react";
import { collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Expense } from "@/lib/types";
import { parseISO, getMonth, getYear, type Month } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  total: {
    label: "Gastos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const expenseConverter = {
    toFirestore(expense: Expense): DocumentData {
        const { id, ...data } = expense;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Expense {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            projectId: data.projectId,
            date: data.date,
            supplierId: data.supplierId,
            categoryId: data.categoryId,
            documentType: data.documentType,
            invoiceNumber: data.invoiceNumber,
            paymentMethod: data.paymentMethod,
            amount: data.amount,
            iva: data.iva,
            iibb: data.iibb,
            iibbJurisdiction: data.iibbJurisdiction,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            receiptUrl: data.receiptUrl,
            description: data.description,
            retencionGanancias: data.retencionGanancias,
            retencionIVA: data.retencionIVA,
            retencionIIBB: data.retencionIIBB,
            retencionSUSS: data.retencionSUSS,
        };
    }
};

export function ExpensesChart() {
    const firestore = useFirestore();

    const expensesQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null, [firestore]);
    const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);
    
    const monthlyExpenses = useMemo(() => {
        if (!expenses) return [];

        const currentYear = new Date().getFullYear();

        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: es.localize?.month(i as Month, { width: 'abbreviated' }).replace('.', '') || '',
            total: 0
        }));

        expenses.forEach(expense => {
            const expenseDate = parseISO(expense.date);
            if (getYear(expenseDate) === currentYear) {
                const monthIndex = getMonth(expenseDate);
                const amountInArs = expense.currency === 'USD' ? expense.amount * expense.exchangeRate : expense.amount;
                monthlyData[monthIndex].total += amountInArs;
            }
        });

        return monthlyData;

    }, [expenses]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Resumen de Gastos</CardTitle>
        <CardDescription>
          Gastos totales por mes para el año actual (en ARS)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
        ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={monthlyExpenses}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                />
                <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                cursor={{ fill: "hsl(var(--accent))" }}
                content={
                    <ChartTooltipContent
                    formatter={(value) =>
                        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
                    }
                    indicator="dot"
                    />
                }
                />
                <Bar
                dataKey="total"
                fill="var(--color-total)"
                radius={[4, 4, 0, 0]}
                />
            </BarChart>
            </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
