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
import { Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { useState } from 'react';

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

  // Client-side pagination state
  const [visibleCount, setVisibleCount] = useState(10);
  const hasMore = expenses.length > visibleCount;

  const visibleExpenses = expenses.slice(0, visibleCount);

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
    <div className="space-y-4">
      <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/20">
              {!hideProjectColumn && <TableHead className="pl-6">Obra</TableHead>}
              <TableHead className={cn(hideProjectColumn && 'pl-6')}>Proveedor</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="hidden lg:table-cell">Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right w-[100px] pr-6">Acciones</TableHead>
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
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay gastos que coincidan con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visibleExpenses.map((expense: Expense) => {
              const isVirtual = expense.supplierId === 'OFICINA-TECNICA' || expense.supplierId === 'personal-propio';
              return (
                <TableRow key={expense.id} className="hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0">
                  {!hideProjectColumn && (
                    <TableCell className="pl-6 py-4">
                      <div className="font-semibold text-foreground">{projectsMap[expense.projectId] || expense.projectId}</div>
                      <div className="text-sm text-muted-foreground">{getCategoryName(expense.categoryId)}</div>
                    </TableCell>
                  )}
                  <TableCell className={cn("py-4", hideProjectColumn && 'pl-6')}>
                    <div className="font-medium">{suppliersMap[expense.supplierId] || expense.supplierId}</div>
                    <div className="text-sm text-muted-foreground">{expense.documentType}</div>
                    <div className="text-sm text-muted-foreground md:hidden mt-2 space-y-1">
                      {!hideProjectColumn && <p>{projectsMap[expense.projectId] || expense.projectId}</p>}
                      <p>{formatDate(expense.date)}</p>
                      <Badge variant={expense.status === 'Pagado' ? 'default' : 'secondary'} className={cn(
                        'capitalize rounded-lg px-2 py-0.5 text-xs',
                        expense.status === 'Pagado' && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                        expense.status === 'Pendiente de Pago' && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                      )}>
                        {expense.status}
                      </Badge>
                      <div className="font-mono pt-1 font-semibold text-foreground text-left">
                        <div>{formatCurrency(expense.amount, expense.currency)}</div>
                        {expense.exchangeRate && expense.exchangeRate > 0 && (
                          <div className="text-xs text-muted-foreground font-normal">
                            {expense.currency === 'ARS'
                              ? `(${formatCurrency(expense.amount / expense.exchangeRate, 'USD')})`
                              : `(${formatCurrency(expense.amount * expense.exchangeRate, 'ARS')})`}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(expense.date)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={cn(
                      'capitalize rounded-xl px-3 py-1',
                      expense.status === 'Pagado' && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                      expense.status === 'Pendiente de Pago' && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                    )}>
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono hidden md:table-cell">
                    <div className="font-medium text-foreground">{formatCurrency(expense.amount, expense.currency)}</div>
                    {expense.exchangeRate > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {expense.currency === 'ARS'
                          ? `(${formatCurrency(expense.amount / expense.exchangeRate, 'USD')})`
                          : `(${formatCurrency(expense.amount * expense.exchangeRate, 'ARS')})`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {permissions.canLoadExpenses && (
                      <div className="flex items-center justify-end gap-1">
                        {isVirtual ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            </AddExpenseDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
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
              )
            })}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="rounded-full px-8 shadow-sm hover:shadow-md transition-all bg-white/50 backdrop-blur-sm border-white/20"
          >
            Cargar más movimientos
          </Button>
        </div>
      )}
    </div>
  );
}
