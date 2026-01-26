'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Moratoria } from '@/lib/types';
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
import { Pencil, CreditCard } from "lucide-react";
import { parseISO, format as formatDateFns, differenceInDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { PlanDePagoDialog } from './plan-de-pago-dialog';
import { PayInstallmentDialog } from './pay-installment-dialog';
import { Progress } from '../ui/progress';

const moratoriaConverter = {
    toFirestore: (data: Moratoria): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Moratoria => ({ ...snapshot.data(options), id: snapshot.id } as Moratoria)
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // The date is already YYYY-MM-DD, so parseISO will work correctly.
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
};

export function PlanesDePagoTable() {
  const firestore = useFirestore();
  const planesQuery = useMemo(() => firestore ? query(collection(firestore, 'moratorias').withConverter(moratoriaConverter)) : null, [firestore]);
  const { data: planes, isLoading } = useCollection(planesQuery);

  const getDueDateStatus = (dateString: string, status: Moratoria['status']) => {
    if (status !== 'Activa') return null;
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
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan de Pago</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead>Próximo Vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && planes?.length === 0 && (
            <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay planes de pago registrados.</TableCell></TableRow>
          )}
          {planes?.map((plan) => {
            const dueDateStatus = getDueDateStatus(plan.nextDueDate, plan.status);
            const progress = (plan.paidInstallments / plan.installments) * 100;
            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">{plan.tax}</div>
                  <div className="text-sm text-muted-foreground font-mono">{formatCurrency(plan.installmentAmount)}</div>
                </TableCell>
                <TableCell>
                    <div className='flex items-center gap-2'>
                        <Progress value={progress} className="w-[100px]" />
                        <span className='text-xs text-muted-foreground'>({plan.paidInstallments}/{plan.installments})</span>
                    </div>
                </TableCell>
                <TableCell>
                  <div className={cn("flex items-center gap-2", 
                    dueDateStatus?.variant === 'destructive' && 'text-destructive',
                    dueDateStatus?.variant === 'warning' && 'text-yellow-500'
                  )}>
                    {formatDate(plan.nextDueDate)}
                  </div>
                   {dueDateStatus && <div className="text-xs">{dueDateStatus.message}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.status === 'Activa' ? 'default' : 'secondary'} className={cn(
                      plan.status === "Activa" && "bg-green-900/40 text-green-300 border-green-700",
                      plan.status === "Finalizada" && "bg-blue-900/40 text-blue-300 border-blue-700",
                      plan.status === "Incumplida" && "bg-red-900/40 text-red-300 border-red-700",
                  )}>{plan.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <div className='flex justify-end items-center'>
                        {plan.status === 'Activa' && (
                            <PayInstallmentDialog plan={plan}>
                                <Button variant="ghost" size="icon">
                                    <CreditCard className="h-4 w-4" />
                                </Button>
                            </PayInstallmentDialog>
                        )}
                        <PlanDePagoDialog plan={plan}>
                            <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </PlanDePagoDialog>
                    </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
