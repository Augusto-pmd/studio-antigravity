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
import { TriangleAlert, Pencil, Users, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ContractorDialog } from "@/components/contratistas/contractor-dialog";
import { PersonnelDialog } from "@/components/contratistas/personnel-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";


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
  const { toast } = useToast();
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

  const handleDelete = (contractorId: string, contractorName: string) => {
    if (!firestore) return;
    const contractorRef = doc(firestore, 'contractors', contractorId);
    deleteDoc(contractorRef)
        .then(() => {
            toast({
                title: "Contratista Eliminado",
                description: `El contratista "${contractorName}" ha sido eliminado.`,
            });
        })
        .catch((error) => {
            console.error("Error deleting contractor: ", error);
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el contratista. Es posible que no tengas permisos.",
            });
        });
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
                                  Esta acción no se puede deshacer. Se eliminará permanentemente al contratista
                                  <span className="font-semibold"> {contractor.name}</span> del sistema.
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                  onClick={() => handleDelete(contractor.id, contractor.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                  Eliminar
                              </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
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
