'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { TechnicalOfficeEmployee, SalaryHistory } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { parseISO, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};
const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM yyyy');
}

function SalaryEvolutionChart({ employeeId }: { employeeId: string }) {
    const firestore = useFirestore();
    const salaryHistoryQuery = useMemo(
        () => firestore ? query(collection(firestore, `technicalOfficeEmployees/${employeeId}/salaryHistory`), orderBy('effectiveDate', 'asc')) : null,
        [firestore, employeeId]
    );
    const { data: salaryHistory, isLoading } = useCollection<SalaryHistory>(salaryHistoryQuery);

    const chartData = useMemo(() => {
        return salaryHistory?.map(h => ({
            date: formatDate(h.effectiveDate),
            salary: h.amount,
        }));
    }, [salaryHistory]);

    const chartConfig = {
        salary: {
            label: "Salario",
            color: "hsl(var(--chart-1))",
        },
    };

    if (isLoading) {
        return <Skeleton className="h-[350px] w-full" />;
    }
    
    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex h-[350px] items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">No hay historial de salarios para este empleado.</p>
            </div>
        );
    }

    return (
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <YAxis 
                    tickFormatter={(value) => `$${value / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(value as number)}
                          indicator="dot"
                        />
                    }
                />
                <Line type="monotone" dataKey="salary" stroke="var(--color-salary)" strokeWidth={2} dot={true} />
            </LineChart>
        </ChartContainer>
    );
}

export function SalaryReports() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
    const firestore = useFirestore();

    const employeesQuery = useMemo(() => (firestore ? query(collection(firestore, 'technicalOfficeEmployees'), where('status', '==', 'Activo')) : null), [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<TechnicalOfficeEmployee>(employeesQuery);
    
    useEffect(() => {
        if (!selectedEmployeeId && employees && employees.length > 0) {
            setSelectedEmployeeId(employees[0].id);
        }
    }, [employees, selectedEmployeeId]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Evolución Salarial por Empleado</CardTitle>
                <CardDescription>Seleccione un empleado para ver el historial de su salario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isLoadingEmployees}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Seleccione un empleado" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {selectedEmployeeId ? <SalaryEvolutionChart employeeId={selectedEmployeeId} /> : (
                     <div className="flex h-[350px] items-center justify-center rounded-md border border-dashed">
                        <p className="text-muted-foreground">Seleccione un empleado para comenzar.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
