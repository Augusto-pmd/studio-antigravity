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
import { monthlyExpenses } from "@/lib/data";

const chartConfig = {
  total: {
    label: "Gastos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function ExpensesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Resumen de Gastos</CardTitle>
        <CardDescription>
          Gastos totales por mes (en miles de ARS)
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    `$${(Number(value) / 1000).toFixed(1)}k`
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
      </CardContent>
    </Card>
  );
}
