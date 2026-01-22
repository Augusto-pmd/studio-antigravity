'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Expense } from '@/lib/types';
import { parseISO, format as formatDateFns } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { Project, Supplier } from '@/lib/types';

const formatCurrency = (amount: number, currency: string) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
};

export function ExpenseReport({ expenses, isLoading }: { expenses: Expense[]; isLoading: boolean }) {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const projectsMap = useMemo(() => {
    return projects?.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}) || {};
  }, [projects]);

  const suppliersMap = useMemo(() => {
    return suppliers?.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}) || {};
  }, [suppliers]);

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Gastos</CardTitle>
        <CardDescription>Detalle de todos los gastos registrados con información fiscal.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">IIBB</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isLoadingProjects || isLoadingSuppliers) && renderSkeleton()}
              {!isLoading && expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay gastos registrados para mostrar.
                  </TableCell>
                </TableRow>
              )}
              {expenses.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell className="font-medium">{projectsMap[expense.projectId] || expense.projectId}</TableCell>
                  <TableCell>{suppliersMap[expense.supplierId] || expense.supplierId}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(expense.iva || 0, 'ARS')}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(expense.iibb || 0, 'ARS')}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
