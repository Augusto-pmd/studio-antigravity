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
import type { Sale, Project } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";
import { Button } from "../ui/button";
import { Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { SaleDialog } from "./sale-dialog";
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

const saleConverter = {
    toFirestore: (data: Sale): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Sale => ({ ...snapshot.data(options), id: snapshot.id } as Sale)
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function SalesTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions } = useUser();

  const salesQuery = useMemo(() => (
    firestore ? query(collectionGroup(firestore, 'sales').withConverter(saleConverter)) : null
  ), [firestore]);
  
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const projectsMap = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, p: Project) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const isLoading = isLoadingSales || isLoadingProjects;

  const handleDelete = (sale: Sale) => {
    if (!firestore) return;
    const saleRef = doc(firestore, `projects/${sale.projectId}/sales/${sale.id}`);
    deleteDoc(saleRef)
      .then(() => {
        toast({ title: "Documento Eliminado", description: `El documento de venta ha sido eliminado.` });
      })
      .catch((error) => {
        console.error("Error deleting sale: ", error);
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el documento. Es posible que no tengas permisos.",
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
              {!isLoading && sales?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay ventas registradas. Comience creando una nueva.
                  </TableCell>
                </TableRow>
              )}
              {sales?.map((sale: Sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="font-medium">{projectsMap[sale.projectId] || sale.projectId}</div>
                    <div className="text-sm text-muted-foreground">{sale.documentType}</div>
                     <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{sale.description}</p>
                        <p>{formatDate(sale.date)}</p>
                        <div className="font-mono pt-1 font-semibold text-foreground">{formatCurrency(sale.totalAmount)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{sale.description}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(sale.date)}</TableCell>
                  <TableCell>
                     <Badge variant="outline" className={cn(
                        'capitalize text-xs',
                        sale.status === 'Pendiente de Cobro' && 'text-yellow-500 border-yellow-500',
                        sale.status === 'Cobrado' && 'text-green-500 border-green-500',
                        sale.status === 'Borrador' && 'text-gray-500 border-gray-500',
                        sale.status === 'Cancelado' && 'text-destructive border-destructive',
                     )}>{sale.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono hidden md:table-cell">{formatCurrency(sale.totalAmount)}</TableCell>
                  {permissions.isSuperAdmin && (
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                            {sale.invoiceUrl && (
                                <Button asChild variant="ghost" size="icon">
                                    <a href={sale.invoiceUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                </Button>
                            )}
                            <SaleDialog sale={sale}>
                            <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                            </Button>
                            </SaleDialog>
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
                                    Esta acción no se puede deshacer. Se eliminará permanentemente este documento de venta.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDelete(sale)}
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

    
