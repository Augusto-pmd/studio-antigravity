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
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc, query, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PROJECTS_PER_PAGE = 10;

  const fetchProjects = async (isNextPage = false) => {
    if (!firestore) return;
    setLoading(true);

    try {
      let q = query(
        collection(firestore, 'projects'),
        orderBy('name', 'asc'),
        limit(PROJECTS_PER_PAGE)
      ).withConverter(projectConverter);

      if (isNextPage && lastVisible) {
        q = query(
          collection(firestore, 'projects'),
          orderBy('name', 'asc'),
          startAfter(lastVisible),
          limit(PROJECTS_PER_PAGE)
        ).withConverter(projectConverter);
      }

      const documentSnapshots = await getDocs(q);
      const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(newLastVisible);

      const newProjects = documentSnapshots.docs.map(doc => doc.data());

      if (newProjects.length < PROJECTS_PER_PAGE) {
        setHasMore(false);
      }

      if (isNextPage) {
        setProjects(prev => [...prev, ...newProjects]);
      } else {
        setProjects(newProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar obras",
        description: "No se pudieron obtener los datos."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [firestore]);

  const handleDelete = (projectId: string, projectName: string) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', projectId);
    deleteDoc(projectRef)
      .then(() => {
        toast({
          title: "Obra Eliminada",
          description: `La obra "${projectName}" ha sido eliminada permanentemente.`,
        });
        // Remove from local state
        setProjects(prev => prev.filter(p => p.id !== projectId));
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
    <div className="space-y-4">
      <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/20">
              <TableHead className="pl-6">Obra</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && projects.length === 0 && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><div className="space-y-2"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/5" /></div></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {!loading && projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No hay obras registradas.
                </TableCell>
              </TableRow>
            )}
            {projects.map((project: Project) => (
              <TableRow key={project.id} className="hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0">
                <TableCell className="pl-6 py-4">
                  <Link href={`/obras/${project.id}`} className="font-semibold text-base hover:text-primary transition-colors block mb-1">{project.name}</Link>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{project.client}</span>
                  </div>
                  <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                    <div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-xs rounded-lg px-2 py-0.5",
                          project.status === "En Curso" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                          project.status === "Pausado" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                          project.status === "Completado" && "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
                          project.status === "Cancelado" && "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
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
                      "capitalize rounded-xl px-3 py-1",
                      project.status === "En Curso" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                      project.status === "Pausado" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                      project.status === "Completado" && "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
                      project.status === "Cancelado" && "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
                    )}
                  >
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                      <Link href={`/obras/${project.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver Detalle</span>
                      </Link>
                    </Button>
                    {permissions.canManageProjects && (
                      <>
                        <AddProjectDialog project={project}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </AddProjectDialog>
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
                                Esta acción no se puede deshacer. Se eliminará permanentemente la obra
                                <span className="font-semibold"> {project.name}</span> y todos sus gastos asociados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(project.id, project.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
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

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchProjects(true)}
            disabled={loading}
            className="rounded-full px-8 shadow-sm hover:shadow-md transition-all bg-white/50 backdrop-blur-sm border-white/20"
          >
            {loading ? "Cargando..." : "Cargar más obras"}
          </Button>
        </div>
      )}
    </div>
  );
}
