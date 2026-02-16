'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { monthlySalaryConverter } from '@/lib/converters';
import { Skeleton } from "@/components/ui/skeleton";

interface SalaryHistoryListProps {
    employeeId: string;
}

export function SalaryHistoryList({ employeeId }: SalaryHistoryListProps) {
    const q = query(
        collection(db, 'monthlySalaries').withConverter(monthlySalaryConverter),
        where('employeeId', '==', employeeId),
        orderBy('period', 'desc')
    );

    const { data: salaries, isLoading } = useCollection(q);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!salaries || salaries.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">No hay historial de liquidaciones registrado.</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Bruto</TableHead>
                        <TableHead>Deducciones</TableHead>
                        <TableHead>Neto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Fecha Pago</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salaries.map((salary) => (
                        <TableRow key={salary.id}>
                            <TableCell className="font-medium">{salary.period}</TableCell>
                            <TableCell>{formatCurrency(salary.grossSalary)}</TableCell>
                            <TableCell className="text-red-500">-{formatCurrency(salary.deductions)}</TableCell>
                            <TableCell className="font-bold text-green-600">{formatCurrency(salary.netSalary)}</TableCell>
                            <TableCell>
                                <Badge variant={salary.status === 'Pagado' ? 'default' : 'secondary'}>
                                    {salary.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
