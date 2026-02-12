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
import type { Expense } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useUser } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { expenseCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Dates can be full ISO strings or YYYY-MM-DD. parseISO handles both.
    try {
        return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
    } catch (e) {
        return dateString; // fallback for invalid date strings
    }
}

interface ExpensesTableProps {
  expenses: Expense[];
  isLoading: boolean;
  projectsMap: Record<string, string>;
  suppliersMap: Record<string, string>;
  hideProjectColumn?: boolean;
}

export function ExpensesTable({ expenses, isLoading, projectsMap, suppliersMap, hideProjectColumn = false }: ExpensesTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions } = useUser();

  const getCategoryName = (categoryId: string) => expenseCategories.find(c => c.id === categoryId)?.name || categoryId;

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
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {!hideProjectColumn && <TableHead>Obra</TableHead>}
                <TableHead className={cn(hideProjectColumn && 'pl-4')}>Proveedor</TableHead>
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
              {!isLoading && expenses.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay gastos que coincidan con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && expenses.map((expense: Expense) => {
                const isVirtual = expense.supplierId === 'OFICINA-TECNICA' || expense.supplierId === 'personal-propio';
                return (
                <TableRow key={expense.id}>
                  {!hideProjectColumn && (
                    <TableCell>
                      <div className="font-medium">{projectsMap[expense.projectId] || expense.projectId}</div>
                      <div className="text-sm text-muted-foreground">{getCategoryName(expense.categoryId)}</div>
                    </TableCell>
                  )}
                  <TableCell className={cn(hideProjectColumn && 'pl-4')}>
                    <div className="font-medium">{suppliersMap[expense.supplierId] || expense.supplierId}</div>
                    <div className="text-sm text-muted-foreground">{expense.documentType}</div>
                    <div className="text-sm text-muted-foreground md:hidden mt-2 space-y-1">
                      {!hideProjectColumn && <p>{projectsMap[expense.projectId] || expense.projectId}</p>}
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
                        {isVirtual ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon">
                                  <Link href={
                                    expense.supplierId === 'personal-propio'
                                    ? `/pago-semanal`
                                    : '/mis-horas'
                                  }>
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Ir a la fuente de datos</span>
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Gasto calculado. Editar en la fuente.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
      </div>
  );
}
