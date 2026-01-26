'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { MonthlySalary } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PaySalaryDialog } from '@/components/contabilidad/pay-salary-dialog';

const salaryConverter = {
  toFirestore: (data: MonthlySalary): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): MonthlySalary => ({ ...snapshot.data(), id: snapshot.id } as MonthlySalary)
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function SalaryPayables() {
  const firestore = useFirestore();
  const { permissions } = useUser();

  const pendingSalariesQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'monthlySalaries').withConverter(salaryConverter), where('status', '==', 'Pendiente de Pago')) : null
  ), [firestore]);

  const { data: salaries, isLoading } = useCollection<MonthlySalary>(pendingSalariesQuery);

  const renderSkeleton = () => Array.from({ length: 2 }).map((_, i) => (
    <TableRow key={`skel-sp-${i}`}>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-9 w-20 rounded-md ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deudas por Salarios</CardTitle>
        <CardDescription>Liquidaciones de sueldo generadas y pendientes de pago.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="hidden sm:table-cell">Período</TableHead>
                <TableHead className="text-right">Neto a Pagar</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && renderSkeleton()}
              {!isLoading && salaries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No hay salarios pendientes de pago.</TableCell>
                </TableRow>
              )}
              {salaries?.map(salary => (
                <TableRow key={salary.id}>
                  <TableCell>
                    <div className="font-medium">{salary.employeeName}</div>
                    <div className="text-sm text-muted-foreground sm:hidden">{salary.period}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{salary.period}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(salary.netSalary)}</TableCell>
                  <TableCell className="text-right">
                    {permissions.isSuperAdmin && (
                      <PaySalaryDialog salary={salary}>
                        <Button size="sm">Pagar</Button>
                      </PaySalaryDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
