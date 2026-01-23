'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddCashAdvanceDialog } from "./add-cash-advance-dialog";
import { useUser, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { CashAdvance, PayrollWeek } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { parseISO, format } from 'date-fns';

const formatCurrency = (amount: number, currency: string = 'ARS') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};

export function CashAdvances() {
  const { firestore } = useUser();

  const payrollWeeksQuery = useMemo(
    () => firestore ? query(collection(firestore, 'payrollWeeks'), where('status', '==', 'Abierta'), limit(1)) : null,
    [firestore]
  );
  const { data: openWeeks, isLoading: isLoadingWeeks } = useCollection<PayrollWeek>(payrollWeeksQuery);
  const currentWeek = useMemo(() => openWeeks?.[0], [openWeeks]);

  const cashAdvancesQuery = useMemo(
    () => firestore && currentWeek ? query(collection(firestore, 'cashAdvances'), where('payrollWeekId', '==', currentWeek.id), orderBy('date', 'desc')) : null,
    [firestore, currentWeek]
  );
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(cashAdvancesQuery);
  
  const isLoading = isLoadingWeeks || isLoadingAdvances;

  const renderSkeleton = () => (
    Array.from({ length: 2 }).map((_, i) => (
      <TableRow key={`skel-adv-${i}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="text-right md:hidden"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card className="mt-4">
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>Gestión de Adelantos</CardTitle>
            <CardDescription>
            Registre y consulte los adelantos de sueldo otorgados a los empleados para la semana actual.
            </CardDescription>
        </div>
        <AddCashAdvanceDialog currentWeek={currentWeek} />
      </CardHeader>
      <CardContent>
        {!currentWeek && !isLoadingWeeks && (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">No hay una semana de pagos abierta. Genere una en "Planillas Semanales".</p>
            </div>
        )}
        {currentWeek && (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead className='hidden md:table-cell'>Empleado</TableHead>
                            <TableHead className='hidden md:table-cell'>Obra</TableHead>
                            <TableHead className="text-right hidden md:table-cell">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && renderSkeleton()}
                        {!isLoading && advances?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No hay adelantos registrados para esta semana.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && advances?.map(advance => (
                                <TableRow key={advance.id}>
                                    <TableCell>
                                      <div>{formatDate(advance.date)}</div>
                                      <div className='md:hidden mt-2 space-y-1 text-sm text-muted-foreground'>
                                        <p className='font-medium text-foreground'>{advance.employeeName}</p>
                                        <p>{advance.projectName || 'N/A'}</p>
                                        <p className='font-mono font-semibold text-foreground'>{formatCurrency(advance.amount)}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className='hidden md:table-cell'>{advance.employeeName}</TableCell>
                                    <TableCell className='hidden md:table-cell'>{advance.projectName || 'N/A'}</TableCell>
                                    <TableCell className="text-right font-mono hidden md:table-cell">{formatCurrency(advance.amount)}</TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
