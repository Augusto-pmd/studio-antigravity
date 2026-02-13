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
import type { Project } from "@/lib/types";
import { Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddProjectDialog } from "@/components/obras/add-project-dialog";
import { useCollection, useUser, useFirestore } from "@/firebase";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';


const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: currency }).format(amount);
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => {
        const data = snapshot.data(options) || {};
        return {
            id: snapshot.id,
            name: data.name || '',
            client: data.client || '',
            address: data.address || '',
            currency: ['ARS', 'USD'].includes(data.currency) ? data.currency : 'ARS',
            status: ['En Curso', 'Completado', 'Pausado', 'Cancelado'].includes(data.status) ? data.status : 'Pausado',
            supervisor: data.supervisor || '',
            budget: data.budget || 0,
            balance: data.balance ?? 0,
            progress: data.progress || 0,
            projectType: data.projectType,
            startDate: data.startDate,
            endDate: data.endDate,
            description: data.description,
        };
    }
};

export function ProjectsTable() {
  const { permissions } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const projectsQuery = useMemo(
    () => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null),
    [firestore]
  );
  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const handleDelete = (projectId: string, projectName: string) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', projectId);
    deleteDoc(projectRef)
      .then(() => {
        toast({
          title: "Obra Eliminada",
          description: `La obra "${projectName}" ha sido eliminada permanentemente.`,
        });
      })
      .catch((error) => {
        console.error("Error deleting project: ", error);
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar la obra. Es posible que no tengas permisos.",
        });
      });
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Obra</TableHead>
            <TableHead className="hidden md:table-cell">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <>
              <TableRow>
                <TableCell><div className="space-y-1"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/5" /></div></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
              </TableRow>
               <TableRow>
                <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-1/5" /></div></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
              </TableRow>
            </>
          )}
          {!isLoading && projects?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No hay obras registradas. Comience creando una nueva.
              </TableCell>
            </TableRow>
          )}
          {projects?.map((project: Project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link href={`/obras/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
                <div className="text-sm text-muted-foreground">{project.client}</div>
                <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                   <div>
                     <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-xs",
                          project.status === "En Curso" && "bg-green-900/40 text-green-300 border-green-700",
                          project.status === "Pausado" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                          project.status === "Completado" && "bg-blue-900/40 text-blue-300 border-blue-700",
                          project.status === "Cancelado" && "bg-red-900/40 text-red-300 border-red-700"
                        )}
                      >
                        {project.status}
                      </Badge>
                   </div>
                    <p><span className="font-medium text-foreground">Saldo:</span> {formatCurrency(project.balance, project.currency)}</p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    project.status === "En Curso" && "bg-green-900/40 text-green-300 border-green-700",
                    project.status === "Pausado" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                    project.status === "Completado" && "bg-blue-900/40 text-blue-300 border-blue-700",
                    project.status === "Cancelado" && "bg-red-900/40 text-red-300 border-red-700"
                  )}
                >
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-0">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={`/obras/${project.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Detalle</span>
                        </Link>
                    </Button>
                    {permissions.canManageProjects && (
                    <>
                        <AddProjectDialog project={project}>
                            <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                            </Button>
                        </AddProjectDialog>
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
                                    Esta acción no se puede deshacer. Se eliminará permanentemente la obra
                                    <span className="font-semibold"> {project.name}</span> y todos sus gastos asociados.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleDelete(project.id, project.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
