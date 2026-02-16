
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { CardDescription } from '@/components/ui/card';
import { ProjectFinancials } from '@/services/financial-analytics';
import { Formatter } from '@/lib/utils';

export function IncomeVsCostChart({ data }: { data: ProjectFinancials[] }) {
    if (!data || data.length === 0) return <div className="h-[350px] flex items-center justify-center text-muted-foreground">Sin datos disponibles</div>;

    const chartData = data.map(p => ({
        name: p.projectName.substring(0, 15),
        Ingresos: p.income.total,
        Costos: p.costs.total,
        Utilidad: p.income.total - p.costs.total
    }));

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                    formatter={(value: number) => Formatter.currency(value)}
                    cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="b" />
                {/* We don't stack Profit, we show it compared? Or maybe just Income vs Cost is enough. Let's keep it simple. */}
            </BarChart>
        </ResponsiveContainer>
    );
}
