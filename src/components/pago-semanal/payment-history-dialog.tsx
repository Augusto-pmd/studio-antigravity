'use client';

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser } from "@/firebase";
import type { ContractorCertification, PayrollWeek } from "@/lib/types";
import { collection, query, orderBy, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { certificationConverter, payrollWeekConverter } from "@/lib/converters";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { DeleteContractorCertificationDialog } from "./delete-contractor-certification-dialog";


const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error("Invalid date");
        return format(date, 'dd/MM/yyyy');
    } catch(e) {
        return dateString; // fallback
    }
};

interface PaymentHistoryDialogProps {
  contractorId: string;
  projectId: string;
  contractorName: string;
  projectName: string;
  children: React.ReactNode;
}

export function PaymentHistoryDialog({ contractorId, projectId, contractorName, projectName, children }: PaymentHistoryDialogProps) {
  const firestore = useFirestore();
  const { permissions } = useUser();

  const historyQuery = useMemo(() => {
    if (!firestore || !contractorId || !projectId) return null;
    return query(
        collection(firestore, 'contractorCertifications'),
        where('contractorId', '==', contractorId),
        where('projectId', '==', projectId),
        where('status', 'in', ['Aprobado', 'Pagado']),
        orderBy('payrollWeekId', 'desc')
    ).withConverter(certificationConverter);
  }, [firestore, contractorId, projectId]);

  const { data: history, isLoading: isLoadingHistory } = useCollection<ContractorCertification>(historyQuery);
  
  const weeksQuery = useMemo(() => firestore ? collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter) : null, [firestore]);
  const { data: weeks, isLoading: isLoadingWeeks } = useCollection<PayrollWeek>(weeksQuery);

  const weekDateMap = useMemo(() => {
      if (!weeks) return new Map<string, string>();
      return new Map(weeks.map(w => [w.id, w.startDate]));
  }, [weeks]);

  const isLoading = isLoadingHistory || isLoadingWeeks;
  
  const totalPaid = useMemo(() => history?.reduce((sum, cert) => sum + cert.amount, 0) || 0, [history]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de Pagos</DialogTitle>
          <DialogDescription>
            Pagos realizados a <span className="font-semibold">{contractorName}</span> para la obra <span className="font-semibold">{projectName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        {permissions.isSuperAdmin && <TableHead className="w-[50px] text-right">Acciones</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={`skel-hist-${i}`}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            {permissions.isSuperAdmin && <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>}
                        </TableRow>
                    ))}
                    {!isLoading && history?.length === 0 && (
                        <TableRow><TableCell colSpan={permissions.isSuperAdmin ? 4 : 3} className="h-24 text-center">No hay pagos registrados.</TableCell></TableRow>
                    )}
                    {history?.map((cert: ContractorCertification) => (
                        <TableRow key={cert.id}>
                            <TableCell>{formatDate(weekDateMap.get(cert.payrollWeekId))}</TableCell>
                            <TableCell>{cert.notes || 'Certificación semanal'}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(cert.amount, cert.currency)}</TableCell>
                            {permissions.isSuperAdmin && (
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DeleteContractorCertificationDialog certification={cert} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <div className="pt-4 border-t font-semibold flex justify-between">
            <span>Total Pagado:</span>
            <span className="font-mono">{formatCurrency(totalPaid, 'ARS')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
