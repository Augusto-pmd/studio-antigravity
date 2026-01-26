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
import { cn } from "@/lib/utils";
import type { Contractor } from "@/lib/types";
import { differenceInDays, parseISO, isBefore, format as formatDateFns } from 'date-fns';
import { TriangleAlert, Pencil, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ContractorDialog } from "@/components/contratistas/contractor-dialog";
import { PersonnelDialog } from "@/components/contratistas/personnel-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const contractorConverter = {
    toFirestore: (data: Contractor): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contractor => ({ ...snapshot.data(options), id: snapshot.id } as Contractor)
};

export function ContractorsTable() {
  const firestore = useFirestore();
  const contractorsQuery = useMemo(() => (firestore ? collection(firestore, 'contractors').withConverter(contractorConverter) : null), [firestore]);
  const { data: contractors, isLoading } = useCollection<Contractor>(contractorsQuery);

  const getDocStatus = (dateString?: string): { variant: 'destructive' | 'warning', message: string } | null => {
    if (!dateString) return null;

    const expiryDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(expiryDate, today);

    if (isBefore(expiryDate, today)) {
        return { variant: 'destructive', message: `Vencido hace ${Math.abs(daysLeft)} días` };
    }
    if (daysLeft <= 30) {
        return { variant: 'warning', message: `Vence en ${daysLeft} días` };
    }
    return null;
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contratista</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && contractors?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay contratistas registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {contractors?.map((contractor: Contractor) => {
                const artStatus = getDocStatus(contractor.artExpiryDate);
                const insuranceStatus = getDocStatus(contractor.insuranceExpiryDate);
                
                return (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <div className="font-medium">{contractor.name}</div>
                    <div className="text-sm text-muted-foreground">{contractor.cuit}</div>
                    <div className="hidden md:block text-sm text-muted-foreground">{contractor.contactPerson}</div>
                    <div className="hidden md:block text-sm text-muted-foreground">{contractor.email}</div>
                    <div className="hidden md:block text-sm text-muted-foreground">{contractor.phone}</div>
                    <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>
                            <Badge
                            variant="outline"
                            className={cn(
                                "capitalize text-xs",
                                contractor.status === "Aprobado" && "bg-green-900/40 text-green-300 border-green-700",
                                contractor.status === "Pendiente" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                                contractor.status === "Rechazado" && "bg-red-900/40 text-red-300 border-red-700",
                            )}
                            >
                            {contractor.status}
                            </Badge>
                        </div>
                        {contractor.contactPerson && <p>Contacto: {contractor.contactPerson}</p>}
                        {contractor.email && <p>{contractor.email}</p>}
                        {contractor.phone && <p>{contractor.phone}</p>}
                        {artStatus && <div className={cn(artStatus.variant === 'destructive' && 'text-destructive', artStatus.variant === 'warning' && 'text-yellow-500')}>ART: {artStatus.message}</div>}
                        {insuranceStatus && <div className={cn(insuranceStatus.variant === 'destructive' && 'text-destructive', insuranceStatus.variant === 'warning' && 'text-yellow-500')}>Seguro: {insuranceStatus.message}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                          "capitalize",
                          contractor.status === "Aprobado" && "bg-green-900/40 text-green-300 border-green-700",
                          contractor.status === "Pendiente" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                          contractor.status === "Rechazado" && "bg-red-900/40 text-red-300 border-red-700",
                      )}
                    >
                      {contractor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <PersonnelDialog contractor={contractor}>
                        <Button variant="ghost" size="icon">
                          <Users className="h-4 w-4" />
                          <span className="sr-only">Ver Personal</span>
                        </Button>
                      </PersonnelDialog>
                      <ContractorDialog contractor={contractor}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                           <span className="sr-only">Editar</span>
                        </Button>
                      </ContractorDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
      </div>
    </TooltipProvider>
  );
}
