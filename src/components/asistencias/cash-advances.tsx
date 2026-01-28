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
import { AddCashAdvanceDialog } from "@/components/asistencias/add-cash-advance-dialog";
import { useUser, useCollection } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { CashAdvance, PayrollWeek } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { parseISO, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditCashAdvanceDialog } from './edit-cash-advance-dialog';
import { DeleteCashAdvanceDialog } from './delete-cash-advance-dialog';

const formatCurrency = (amount: number, currency: string = 'ARS') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};

const cashAdvanceConverter = {
    toFirestore(advance: CashAdvance): DocumentData {
        const { id, ...data } = advance;
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            projectId: data.projectId,
            projectName: data.projectName,
            date: data.date,
            amount: data.amount,
            reason: data.reason,
            payrollWeekId: data.payrollWeekId,
        };
    }
};

export function CashAdvances({ currentWeek, isLoadingWeek }: { currentWeek?: PayrollWeek, isLoadingWeek: boolean }) {
  const { firestore } = useUser();

  const cashAdvancesQuery = useMemo(
    () => firestore && currentWeek ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null,
    [firestore, currentWeek]
  );
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(cashAdvancesQuery);
  
  const isLoading = isLoadingWeek || isLoadingAdvances;

  const renderSkeleton = () => (
    Array.from({ length: 2 }).map((_: any, i: number) => (
      <TableRow key={`skel-adv-${i}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
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
        {!currentWeek && !isLoadingWeek && (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">No hay una semana de pagos abierta. Genere una para poder registrar adelantos.</p>
            </div>
        )}
        {currentWeek && (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Empleado</TableHead>
                            <TableHead className='hidden md:table-cell'>Fecha</TableHead>
                            <TableHead className='hidden lg:table-cell'>Obra</TableHead>
                            <TableHead className='hidden lg:table-cell'>Motivo</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && renderSkeleton()}
                        {!isLoading && advances?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No hay adelantos registrados para esta semana.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && advances?.map((advance: CashAdvance) => (
                                <TableRow key={advance.id}>
                                    <TableCell>
                                      <div className='font-medium'>{advance.employeeName}</div>
                                      <div className='md:hidden mt-2 space-y-1 text-sm text-muted-foreground'>
                                        <p>{formatDate(advance.date)}</p>
                                        <p>{advance.projectName || 'N/A'}</p>
                                        {advance.reason && <p className="italic">"{advance.reason}"</p>}
                                      </div>
                                    </TableCell>
                                    <TableCell className='hidden md:table-cell'>{formatDate(advance.date)}</TableCell>
                                    <TableCell className='hidden lg:table-cell'>{advance.projectName || 'N/A'}</TableCell>
                                    <TableCell className='hidden lg:table-cell italic text-muted-foreground'>{advance.reason || '-'}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(advance.amount)}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end items-center">
                                        <EditCashAdvanceDialog advance={advance} currentWeek={currentWeek}>
                                          <Button variant="ghost" size="icon">
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </EditCashAdvanceDialog>
                                        <DeleteCashAdvanceDialog advance={advance} />
                                      </div>
                                    </TableCell>
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
