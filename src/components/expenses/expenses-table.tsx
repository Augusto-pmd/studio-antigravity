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
import type { Expense, Project, Supplier } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { expenseCategories } from "@/lib/data";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => {
      const { id, ...rest } = data;
      return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => {
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
            status: data.status,
            paidDate: data.paidDate,
            treasuryAccountId: data.treasuryAccountId,
        };
    }
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

export function ExpensesTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions } = useUser();

  const expensesQuery = useMemo(() => (
    firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null
  ), [firestore]);
  
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const projectsMap = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const suppliersMap = useMemo(() => {
    if (!suppliers) return {};
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);
  }, [suppliers]);

  const getCategoryName = (categoryId: string) => expenseCategories.find(c => c.id === categoryId)?.name || categoryId;

  const isLoading = isLoadingExpenses || isLoadingProjects || isLoadingSuppliers;

  const handleDelete = (expense: Expense) => {
    if (!firestore) return;
    const expenseRef = doc(firestore, `projects/${expense.projectId}/expenses/${expense.id}`);
    deleteDoc(expenseRef)
      .then(() => {
        toast({
          title: "Gasto Eliminado",
          description: `El gasto ha sido eliminado permanentemente.`,
        });
      })
      .catch((error) => {
        console.error("Error deleting expense: ", error);
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el gasto. Es posible que no tengas permisos.",
        });
      });
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden lg:table-cell">Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && expenses?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay gastos registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {expenses?.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium">{projectsMap[expense.projectId] || expense.projectId}</div>
                    <div className="text-sm text-muted-foreground">{getCategoryName(expense.categoryId)}</div>
                    <div className="text-sm text-muted-foreground">{expense.documentType}</div>
                    <div className="text-sm text-muted-foreground md:hidden mt-2 space-y-1">
                      <p>{suppliersMap[expense.supplierId] || expense.supplierId}</p>
                      <p>{formatDate(expense.date)}</p>
                      <Badge variant={expense.status === 'Pagado' ? 'default' : 'secondary'} className={cn(
                          'capitalize',
                          expense.status === 'Pagado' && "bg-green-900/40 text-green-300 border-green-700",
                          expense.status === 'Pendiente de Pago' && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                      )}>
                        {expense.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{suppliersMap[expense.supplierId] || expense.supplierId}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(expense.date)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                     <Badge variant={expense.status === 'Pagado' ? 'default' : 'secondary'} className={cn(
                          'capitalize',
                          expense.status === 'Pagado' && "bg-green-900/40 text-green-300 border-green-700",
                          expense.status === 'Pendiente de Pago' && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                      )}>
                        {expense.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                  <TableCell className="text-right">
                    {permissions.canLoadExpenses && (
                      <div className="flex items-center justify-end">
                        <AddExpenseDialog expense={expense}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </AddExpenseDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente este gasto.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(expense)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
