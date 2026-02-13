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
      <div className="space-y-4">
        <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-white/20">
                <TableHead className="pl-6">Contratista</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
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
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay contratistas registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {contractors?.map((contractor: Contractor) => {
                const artStatus = getDocStatus(contractor.artExpiryDate);
                const insuranceStatus = getDocStatus(contractor.insuranceExpiryDate);

                return (
                  <TableRow key={contractor.id} className="hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0">
                    <TableCell className="pl-6 py-4">
                      <div className="font-semibold text-base text-foreground">{contractor.name}</div>
                      <div className="text-sm text-muted-foreground">{contractor.cuit}</div>
                      <div className="hidden md:block text-sm text-muted-foreground">{contractor.contactPerson}</div>
                      <div className="hidden md:block text-sm text-muted-foreground">{contractor.email}</div>
                      <div className="hidden md:block text-sm text-muted-foreground">{contractor.phone}</div>
                      <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize text-xs rounded-lg px-2 py-0.5",
                              contractor.status === "Aprobado" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                              contractor.status === "Pendiente" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                              contractor.status === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
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
                          "capitalize rounded-xl px-3 py-1",
                          contractor.status === "Aprobado" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                          contractor.status === "Pendiente" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                          contractor.status === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
                        )}
                      >
                        {contractor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <PersonnelDialog contractor={contractor}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <Users className="h-4 w-4" />
                            <span className="sr-only">Ver Personal</span>
                          </Button>
                        </PersonnelDialog>
                        <ContractorDialog contractor={contractor}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </ContractorDialog>
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
                                Esta acción no se puede deshacer. Se eliminará permanentemente al contratista
                                <span className="font-semibold"> {contractor.name}</span> del sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(contractor.id, contractor.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
