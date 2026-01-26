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
import type { Contract, Project } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";
import { Button } from "../ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { ContractDialog } from "./contract-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const contractConverter = {
    toFirestore: (data: Contract): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contract => ({ ...snapshot.data(options), id: snapshot.id } as Contract)
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function ContractsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions } = useUser();

  const contractsQuery = useMemo(() => (
    firestore ? query(collectionGroup(firestore, 'contracts').withConverter(contractConverter)) : null
  ), [firestore]);
  
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<Contract>(contractsQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const projectsMap = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);
  }, [projects]);

  const isLoading = isLoadingContracts || isLoadingProjects;

  const handleDelete = (contract: Contract) => {
    if (!firestore) return;
    const contractRef = doc(firestore, `projects/${contract.projectId}/contracts/${contract.id}`);
    deleteDoc(contractRef)
      .then(() => {
        toast({ title: "Contrato Eliminado", description: `El contrato ha sido eliminado.` });
      })
      .catch((error) => {
        console.error("Error deleting contract: ", error);
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el contrato. Es posible que no tengas permisos.",
        });
      });
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                {permissions.isSuperAdmin && <TableHead className="text-right w-[100px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && contracts?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay contratos registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {contracts?.map((contract: Contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="font-medium">{projectsMap[contract.projectId] || contract.projectId}</div>
                     <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{contract.description}</p>
                        <p>{formatDate(contract.date)}</p>
                        <div className="font-mono pt-1 font-semibold text-foreground">{formatCurrency(contract.totalAmount)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{contract.description}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(contract.date)}</TableCell>
                  <TableCell>
                     <Badge variant="outline" className={cn(
                        'capitalize text-xs',
                        contract.status === 'Activo' && 'text-green-500 border-green-500',
                        contract.status === 'Finalizado' && 'text-blue-500 border-blue-500',
                        contract.status === 'Borrador' && 'text-yellow-500 border-yellow-500',
                        contract.status === 'Cancelado' && 'text-red-500 border-red-500',
                     )}>{contract.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono hidden md:table-cell">{formatCurrency(contract.totalAmount)}</TableCell>
                  {permissions.isSuperAdmin && (
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                            <ContractDialog contract={contract}>
                            <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                            </Button>
                            </ContractDialog>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente este contrato.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDelete(contract)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
