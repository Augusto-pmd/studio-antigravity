'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Expense, Project, Supplier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { parseISO, format } from 'date-fns';
import { PayExpenseDialog } from '@/components/contabilidad/pay-expense-dialog';
import { expenseConverter, projectConverter, supplierConverter } from '@/lib/converters';

const formatCurrency = (amount: number, currency: string) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return format(parseISO(dateString), 'dd/MM/yyyy');
};

export function AccountsPayable() {
  const firestore = useFirestore();
  const { permissions } = useUser();

  const pendingExpensesQuery = useMemo(() => (
    firestore ? query(
        collectionGroup(firestore, 'expenses').withConverter(expenseConverter), 
        where('status', '==', 'Pendiente de Pago'),
        where('documentType', '!=', 'Nota de Crédito')
    ) : null
  ), [firestore]);

  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(pendingExpensesQuery);
  
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const projectsMap = useMemo(() => projects?.reduce((acc: Record<string, string>, p: Project) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>) || {}, [projects]);
  const suppliersMap = useMemo(() => suppliers?.reduce((acc: Record<string, string>, s: Supplier) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>) || {}, [suppliers]);

  const isLoading = isLoadingExpenses || isLoadingProjects || isLoadingSuppliers;

  const renderSkeleton = () => Array.from({ length: 2 }).map((_, i) => (
    <TableRow key={`skel-ap-${i}`}>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-9 w-20 rounded-md ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas por Pagar</CardTitle>
        <CardDescription>Facturas de proveedores pendientes de pago. Desde aquí se registran los pagos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Obra</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Monto</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && renderSkeleton()}
              {!isLoading && expenses?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No hay cuentas pendientes de pago.</TableCell>
                </TableRow>
              )}
              {expenses?.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium">{suppliersMap[expense.supplierId] || expense.supplierId}</div>
                    <div className="text-sm text-muted-foreground">{expense.invoiceNumber || 'S/N'}</div>
                     <div className="sm:hidden mt-2 font-mono font-semibold">{formatCurrency(expense.amount, expense.currency)}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{projectsMap[expense.projectId] || expense.projectId}</TableCell>
                  <TableCell className="text-right font-mono hidden sm:table-cell">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                  <TableCell className="text-right">
                    {permissions.canSupervise && (
                      <PayExpenseDialog expense={expense}>
                        <Button size="sm">Pagar</Button>
                      </PayExpenseDialog>
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
