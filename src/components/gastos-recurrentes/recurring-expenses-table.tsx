'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { RecurringExpense } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";
import { parseISO, format as formatDateFns, differenceInDays, isBefore } from 'date-fns';
import { cn } from "@/lib/utils";
import { RecurringExpenseDialog } from '@/components/gastos-recurrentes/recurring-expense-dialog';

const recurringExpenseConverter = {
    toFirestore: (data: RecurringExpense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RecurringExpense => ({ ...snapshot.data(options), id: snapshot.id } as RecurringExpense)
};

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // The date is already YYYY-MM-DD, so parseISO will work correctly.
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
};

export function RecurringExpensesTable() {
  const firestore = useFirestore();
  const expensesQuery = useMemo(() => firestore ? query(collection(firestore, 'recurringExpenses').withConverter(recurringExpenseConverter)) : null, [firestore]);
  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const getDueDateStatus = (dateString: string) => {
    const dueDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(dueDate, today);

    if (isBefore(dueDate, today)) {
        return { variant: 'destructive', message: `Vencido hace ${Math.abs(daysLeft)} días` };
    }
    if (daysLeft <= 7) {
        return { variant: 'warning', message: `Vence en ${daysLeft} días` };
    }
    return null;
  };

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead className="hidden sm:table-cell">Monto</TableHead>
            <TableHead className="hidden md:table-cell">Fechas</TableHead>
            <TableHead className="hidden lg:table-cell">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && expenses?.length === 0 && (
            <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay gastos recurrentes registrados.</TableCell></TableRow>
          )}
          {expenses?.map((expense: RecurringExpense) => {
            const dueDateStatus = getDueDateStatus(expense.nextDueDate);
            return (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">{expense.category} ({expense.period})</div>
                  {expense.notes && <p className="text-xs italic text-muted-foreground pt-1">"{expense.notes}"</p>}
                  <div className="mt-2 space-y-1 text-sm md:hidden">
                    <div className="font-mono sm:hidden">{formatCurrency(expense.amount, expense.currency)}</div>
                     <div className={cn("font-medium md:hidden", 
                        dueDateStatus?.variant === 'destructive' && 'text-destructive',
                        dueDateStatus?.variant === 'warning' && 'text-yellow-500'
                    )}>
                        Vence: {formatDate(expense.nextDueDate)}
                         {dueDateStatus && <span className="ml-2 text-xs">({dueDateStatus.message})</span>}
                    </div>
                     <div className='lg:hidden'>
                        <Badge variant={expense.status === 'Activo' ? 'default' : 'secondary'} className={cn(
                            'capitalize',
                            expense.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                        )}>{expense.status}</Badge>
                     </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="font-mono">{formatCurrency(expense.amount, expense.currency)}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    <div className={cn("font-medium", 
                        dueDateStatus?.variant === 'destructive' && 'text-destructive',
                        dueDateStatus?.variant === 'warning' && 'text-yellow-500'
                    )}>
                        Vence: {formatDate(expense.nextDueDate)}
                    </div>
                    {expense.issueDate && <div className="text-xs text-muted-foreground">Emisión: {formatDate(expense.issueDate)}</div>}
                    {dueDateStatus && <div className="text-xs mt-1">{dueDateStatus.message}</div>}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={expense.status === 'Activo' ? 'default' : 'secondary'} className={cn(
                      'capitalize',
                      expense.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                  )}>{expense.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RecurringExpenseDialog expense={expense}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </RecurringExpenseDialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
    
