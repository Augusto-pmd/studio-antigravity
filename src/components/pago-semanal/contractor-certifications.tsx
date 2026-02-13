'use client';

import { useMemo, useEffect } from 'react';
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
import { collection, query, where, doc, updateDoc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, getDocs } from 'firebase/firestore';
import type { ContractorCertification, PayrollWeek, Expense, Contractor } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { parseISO, format } from 'date-fns';
import { AddContractorCertificationDialog } from './add-contractor-certification-dialog';
import { MoreHorizontal, Check, X, Undo, Receipt, History, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EditContractorCertificationDialog } from './edit-contractor-certification-dialog';
import { DeleteContractorCertificationDialog } from './delete-contractor-certification-dialog';
import { PaymentHistoryDialog } from './payment-history-dialog';


// --- Helper Functions ---
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


// --- Converters ---
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
  const { firestore, permissions, user } = useUser();
  const { toast } = useToast();

  const certificationsQuery = useMemo(() => {
    if (!firestore || !currentWeek) return null;
    return query(
      collection(firestore, 'contractorCertifications').withConverter(certificationConverter),
      where('payrollWeekId', '==', currentWeek.id)
    );
  }, [firestore, currentWeek]);

  const { data: certifications, isLoading: isLoadingCerts } = useCollection<ContractorCertification>(certificationsQuery);

  const allContractorsQuery = useMemo(() => firestore ? collection(firestore, 'contractors').withConverter(contractorConverter) : null, [firestore]);
  const { data: allContractors, isLoading: isLoadingContractors } = useCollection<Contractor>(allContractorsQuery);

  const allPaidCertsQuery = useMemo(() => firestore ? query(collection(firestore, 'contractorCertifications'), where('status', '==', 'Pagado')) : null, [firestore]);
  const { data: allPaidCerts, isLoading: isLoadingAllCerts } = useCollection<ContractorCertification>(allPaidCertsQuery);

  const isLoading = isLoadingWeek || isLoadingCerts || isLoadingContractors || isLoadingAllCerts;

  const totalPaidByContractorProject = useMemo(() => {
    const paidMap = new Map<string, number>();
    if (!allPaidCerts) return paidMap;
    allPaidCerts.forEach(cert => {
        const key = `${cert.contractorId}-${cert.projectId}`;
        paidMap.set(key, (paidMap.get(key) || 0) + cert.amount);
    });
    return paidMap;
  }, [allPaidCerts]);

  
  const handleStatusChange = async (cert: ContractorCertification, status: ContractorCertification['status']) => {
     if (!firestore || !currentWeek) return;
      try {
          const batch = writeBatch(firestore);
          const certRef = doc(firestore, 'contractorCertifications', cert.id);
          const updateData: any = { status };

          if (status === 'Pagado' && !cert.relatedExpenseId) {
              const expenseRef = doc(collection(firestore, `projects/${cert.projectId}/expenses`));
              const expenseData: Omit<Expense, 'id'> = {
                  projectId: cert.projectId,
                  date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                  supplierId: cert.contractorId,
                  categoryId: 'CAT-02', // Mano de Obra (Subcontratos)
                  documentType: 'Recibo Común',
                  paymentSource: 'Tesorería',
                  description: `Certificación: ${cert.contractorName}`,
                  amount: cert.amount,
                  currency: cert.currency,
                  exchangeRate: 1,
                  status: 'Pagado',
                  paymentMethod: 'Planilla Semanal',
                  paidDate: new Date().toISOString().split('T')[0],
              };
              batch.set(expenseRef, expenseData);
              updateData.relatedExpenseId = expenseRef.id;
          } else if (cert.status === 'Pagado' && status !== 'Pagado' && cert.relatedExpenseId) {
              const expenseRef = doc(firestore, `projects/${cert.projectId}/expenses`, cert.relatedExpenseId);
              batch.delete(expenseRef);
              updateData.relatedExpenseId = null;
          }

          batch.update(certRef, updateData);
          await batch.commit();
          toast({ title: 'Estado actualizado' });
      } catch (error) {
          console.error('Error updating status:', error);
          toast({ variant: 'destructive', title: 'Error al actualizar' });
      }
  };


  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>Certificaciones de Contratistas</CardTitle>
            <CardDescription>Registre y apruebe los montos a pagar a contratistas.</CardDescription>
        </div>
        <AddContractorCertificationDialog currentWeek={currentWeek} />
      </CardHeader>
      <CardContent>
        {!currentWeek && !isLoadingWeek ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">No hay una semana de pagos seleccionada.</p>
            </div>
        ) : (
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
                        {isLoading && (
                            Array.from({ length: 2 }).map((_, i) => (
                                <TableRow key={`skel-cert-${i}`}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-9 w-10 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        )}
                        {!isLoading && currentWeek && (!certifications || certifications.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No se encontraron certificaciones para esta semana.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && certifications?.map((cert) => {
                            const contractor = allContractors?.find(c => c.id === cert.contractorId);
                            const budgetData = contractor?.budgets?.[cert.projectId];
                            const totalBudget = (budgetData?.initial || 0) + (budgetData?.additionals || []).reduce((sum, ad) => sum + ad.amount, 0);
                            const totalPaid = totalPaidByContractorProject.get(`${cert.contractorId}-${cert.projectId}`) || 0;
                            const remainingBalance = totalBudget - totalPaid;
                            const canDelete = permissions.isSuperAdmin || (user?.uid === cert.requesterId && cert.status !== 'Pagado');

                            return (
                                <TableRow key={cert.id}>
                                    <TableCell className="font-medium">{cert.contractorName}</TableCell>
                                    <TableCell className='hidden md:table-cell'>{cert.projectName}</TableCell>
                                    <TableCell><Badge variant={cert.status === 'Pagado' ? 'default' : 'outline'}>{cert.status}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(cert.amount, cert.currency)}</TableCell>
                                    <TableCell className="text-right font-mono">{totalBudget > 0 ? formatCurrency(remainingBalance, cert.currency) : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {permissions.canSupervise && cert.status === 'Pendiente' && <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Aprobado')}><Check className="mr-2 h-4 w-4" />Aprobar</DropdownMenuItem>}
                                                {permissions.canSupervise && cert.status === 'Aprobado' && <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Pagado')}><Receipt className="mr-2 h-4 w-4" />Marcar Pagado</DropdownMenuItem>}
                                                {permissions.canSupervise && (cert.status === 'Aprobado' || cert.status === 'Rechazado') && <DropdownMenuItem onClick={() => handleStatusChange(cert, 'Pendiente')}><Undo className="mr-2 h-4 w-4" />Revertir a Pendiente</DropdownMenuItem>}
                                                <DropdownMenuSeparator />
                                                <PaymentHistoryDialog contractorId={cert.contractorId} projectId={cert.projectId} contractorName={cert.contractorName} projectName={cert.projectName}><DropdownMenuItem onSelect={e => e.preventDefault()}><History className="mr-2 h-4 w-4" />Historial</DropdownMenuItem></PaymentHistoryDialog>
                                                <EditContractorCertificationDialog certification={cert}><DropdownMenuItem onSelect={e => e.preventDefault()}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem></EditContractorCertificationDialog>
                                                {canDelete && <DeleteContractorCertificationDialog certification={cert} />}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
