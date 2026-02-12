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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { ContractorCertification, PayrollWeek, Expense, Contractor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { parseISO, format } from 'date-fns';
import { AddContractorCertificationDialog } from './add-contractor-certification-dialog';
import { MoreHorizontal, Check, X, Undo, Receipt, Archive, Pencil, Trash2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditContractorCertificationDialog } from './edit-contractor-certification-dialog';
import { DeleteContractorCertificationDialog } from './delete-contractor-certification-dialog';
import { PaymentHistoryDialog } from './payment-history-dialog';

const parseNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
        const cleanedString = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedString);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

const formatCurrency = (amount: number, currency: string = 'ARS') => {
  if (typeof amount !== 'number' || isNaN(amount)) return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};

const certificationConverter = {
    toFirestore: (cert: ContractorCertification): DocumentData => cert,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => {
        const data = snapshot.data(options)!;
        return {
            ...data,
            id: snapshot.id,
            amount: parseNumber(data.amount),
        } as ContractorCertification;
    }
};

const contractorConverter = {
    toFirestore: (data: Contractor): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contractor => ({ ...snapshot.data(options), id: snapshot.id } as Contractor)
};


export function ContractorCertifications({ currentWeek, isLoadingWeek }: { currentWeek?: PayrollWeek, isLoadingWeek: boolean }) {
  const { firestore, permissions, role, user } = useUser();
  const { toast } = useToast();

  const certificationsQuery = useMemo(() => {
    if (!firestore || !currentWeek) return null;
    return query(
      collection(firestore, 'contractorCertifications').withConverter(certificationConverter),
      where('payrollWeekId', '==', currentWeek.id)
    );
  }, [firestore, currentWeek]);

  const { data: certifications, isLoading: isLoadingCerts } = useCollection<ContractorCertification>(certificationsQuery);

  // Fetch all contractors to get budget info
  const allContractorsQuery = useMemo(() => firestore ? collection(firestore, 'contractors').withConverter(contractorConverter) : null, [firestore]);
  const { data: allContractors, isLoading: isLoadingContractors } = useCollection<Contractor>(allContractorsQuery);

  // Fetch all paid certifications to calculate total paid amounts
  const allPaidCertsQuery = useMemo(() => firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('status', '==', 'Pagado')) : null, [firestore]);
  const { data: allPaidCerts, isLoading: isLoadingAllCerts } = useCollection<ContractorCertification>(allPaidCertsQuery);

  const isLoading = isLoadingWeek || isLoadingCerts || isLoadingContractors || isLoadingAllCerts;

  const totalPaidByContractorProject = useMemo(() => {
    const paidMap = new Map<string, number>();
    if (!allPaidCerts) return paidMap;

    allPaidCerts.forEach((cert: ContractorCertification) => {
        if (!cert.contractorId || !cert.projectId) return;
        const key = `${cert.contractorId}-${cert.projectId}`;
        const currentPaid = paidMap.get(key) || 0;
        const certAmount = parseNumber(cert.amount);
        paidMap.set(key, currentPaid + certAmount);
    });
    return paidMap;
  }, [allPaidCerts]);

  
  const handleStatusChange = async (cert: ContractorCertification, status: ContractorCertification['status']) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error de conexión' });
      return;
    }
  
    try {
      const batch = writeBatch(firestore);
      const certRef = doc(firestore, 'contractorCertifications', cert.id);
  
      const updateData: {
        status: ContractorCertification['status'];
        relatedExpenseId?: string | null;
      } = { status };
  
      if (status === 'Pagado') {
        if (!currentWeek) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No hay una semana de pagos activa.',
          });
          return;
        }
  
        // Only create expense if it doesn't exist
        if (!cert.relatedExpenseId) {
          const expenseRef = doc(
            collection(firestore, `projects/${cert.projectId}/expenses`)
          );
  
          const expenseData: Omit<Expense, 'id'> = {
            projectId: cert.projectId,
            date: new Date().toISOString(),
            supplierId: cert.contractorId,
            categoryId: 'CAT-02', // Mano de Obra (Subcontratos)
            documentType: 'Recibo Común',
            paymentSource: 'Tesorería',
            description: `Certificación de contratista: ${
              cert.contractorName
            } - Semana ${format(
              parseISO(currentWeek.startDate),
              'dd/MM/yy'
            )} a ${format(parseISO(currentWeek.endDate), 'dd/MM/yy')}`,
            amount: cert.amount,
            currency: cert.currency,
            exchangeRate: 1, // Assume 1:1 for this flow
            status: 'Pagado',
            paymentMethod: 'Planilla Semanal',
            paidDate: new Date().toISOString(),
          };
          batch.set(expenseRef, expenseData);
          updateData.relatedExpenseId = expenseRef.id;
        }
      } else if (cert.status === 'Pagado' && cert.relatedExpenseId) {
        // If moving from 'Pagado' to another status, delete the associated expense
        const expenseRef = doc(
          firestore,
          `projects/${cert.projectId}/expenses`,
          cert.relatedExpenseId
        );
        batch.delete(expenseRef);
        updateData.relatedExpenseId = null;
      }
  
      batch.update(certRef, updateData);
  
      await batch.commit();
      toast({
        title: 'Estado actualizado',
        description: `La certificación ha sido marcada como ${status.toLowerCase()}${
          status === 'Pagado'
            ? ' y se ha generado el gasto correspondiente.'
            : '.'
        }`,
      });
    } catch (error) {
      console.error('Error updating status or creating expense:', error);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudo completar la operación.',
      });
    }
  };


  const renderSkeleton = () => (
    Array.from({ length: 2 }).map((_: any, i: number) => (
      <TableRow key={`skel-cert-${i}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-20 rounded-md ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>Certificaciones de Contratistas</CardTitle>
            <CardDescription>
            Registre y apruebe los montos a pagar a contratistas para la semana actual.
            </CardDescription>
        </div>
        <AddContractorCertificationDialog currentWeek={currentWeek} />
      </CardHeader>
      <CardContent>
        {isLoadingWeek && (
             <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">Cargando semana...</p>
            </div>
        )}
        {!isLoadingWeek && !currentWeek && (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">No hay una semana de pagos abierta.</p>
            </div>
        )}
        {currentWeek && (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contratista</TableHead>
                            <TableHead className='hidden md:table-cell'>Obra</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Saldo Restante</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && renderSkeleton()}
                        {!isLoading && certifications?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No hay certificaciones registradas para esta semana.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && certifications?.map((cert: ContractorCertification) => {
                             const contractor = allContractors?.find((c: Contractor) => c.id === cert.contractorId);
                             const budgetData = contractor?.budgets?.[cert.projectId];
                             const additionalsTotal = (budgetData?.additionals || []).reduce((sum, ad) => sum + (ad.amount || 0), 0);
                             const totalBudget = (budgetData?.initial || 0) + additionalsTotal;
                             const totalPaid = totalPaidByContractorProject.get(`${cert.contractorId}-${cert.projectId}`) || 0;
                             const remainingBalance = totalBudget - totalPaid;
                             const canDelete = permissions.isSuperAdmin || (user?.uid === cert.requesterId && cert.status !== 'Pagado');


                            return(
                            <TableRow key={cert.id}>
                                <TableCell className="font-medium">{cert.contractorName}</TableCell>
                                <TableCell className='hidden md:table-cell'>{cert.projectName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn(
                                      'capitalize',
                                      cert.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                                      cert.status === 'Aprobado' && 'text-green-500 border-green-500',
                                      cert.status === 'Pagado' && 'text-blue-500 border-blue-500',
                                      cert.status === 'Rechazado' && 'text-destructive border-destructive',
                                  )}>
                                      {cert.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(cert.amount, cert.currency)}</TableCell>
                                <TableCell className="text-right font-mono">
                                    {totalBudget > 0 ? formatCurrency(remainingBalance, cert.currency) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    {permissions.canSupervise && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {cert.status === 'Pendiente' && <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Aprobado')}><Check className="mr-2 h-4 w-4 text-green-500" /><span>Aprobar</span></DropdownMenuItem>}
                                                {cert.status === 'Aprobado' && <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Pagado')}><Receipt className="mr-2 h-4 w-4 text-blue-500" /><span>Marcar como Pagado</span></DropdownMenuItem>}
                                                
                                                {cert.status !== 'Pagado' && cert.status !== 'Rechazado' && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Rechazado')} className="text-destructive focus:text-destructive"><X className="mr-2 h-4 w-4" /><span>Rechazar</span></DropdownMenuItem>
                                                )}
                                                
                                                {(cert.status === 'Aprobado' || cert.status === 'Rechazado') && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Pendiente')}><Undo className="mr-2 h-4 w-4" /><span>Volver a Pendiente</span></DropdownMenuItem>
                                                )}

                                                <DropdownMenuSeparator />
                                                
                                                <PaymentHistoryDialog
                                                    contractorId={cert.contractorId}
                                                    projectId={cert.projectId}
                                                    contractorName={cert.contractorName}
                                                    projectName={cert.projectName}
                                                >
                                                     <DropdownMenuItem onSelect={(e: any) => e.preventDefault()}>
                                                        <History className="mr-2 h-4 w-4" />
                                                        <span>Historial de Pagos</span>
                                                    </DropdownMenuItem>
                                                </PaymentHistoryDialog>
                                                
                                                {cert.status !== 'Pagado' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <EditContractorCertificationDialog certification={cert}>
                                                            <DropdownMenuItem onSelect={(e: any) => e.preventDefault()}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                <span>Editar</span>
                                                            </DropdownMenuItem>
                                                        </EditContractorCertificationDialog>
                                                    </>
                                                )}
                                                {canDelete && (
                                                  <DeleteContractorCertificationDialog certification={cert} />
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
