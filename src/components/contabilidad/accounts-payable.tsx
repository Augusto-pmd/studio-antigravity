'use client';

import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, doc, updateDoc } from 'firebase/firestore';
import type { Expense, Project, Supplier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { parseISO, format } from 'date-fns';
import { PayExpenseDialog } from '@/components/contabilidad/pay-expense-dialog';
import { expenseConverter, projectConverter, supplierConverter } from '@/lib/converters';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CreditCard, Archive, Loader2 } from 'lucide-react';


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
  const { toast } = useToast();
  const [isArchiving, setIsArchiving] = useState<string | null>(null);

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

  const handleArchive = async (expense: Expense) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error de conexión' });
      return;
    }
    setIsArchiving(expense.id);
    try {
      const expenseRef = doc(firestore, `projects/${expense.projectId}/expenses`, expense.id);
      await updateDoc(expenseRef, {
        status: 'Pagado',
        paymentMethod: 'Histórico',
        paidDate: expense.date,
      });
      toast({
        title: "Gasto Archivado",
        description: "El gasto ha sido marcado como pagado (histórico).",
      });
    } catch (error) {
      console.error("Error archiving expense:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar el gasto.' });
    } finally {
      setIsArchiving(null);
    }
  };


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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <PayExpenseDialog expense={expense}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center cursor-pointer">
                              <CreditCard className="mr-2 h-4 w-4" />
                              <span>Registrar Pago</span>
                            </DropdownMenuItem>
                          </PayExpenseDialog>
                          <DropdownMenuItem onSelect={() => handleArchive(expense)} disabled={isArchiving === expense.id} className="flex items-center cursor-pointer">
                            {isArchiving === expense.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                            <span>Archivar (Pago Histórico)</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
