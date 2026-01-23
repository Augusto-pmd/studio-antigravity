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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { AddProjectDialog } from "./add-project-dialog";
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase/provider";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
};

export function ProjectsTable() {
  const firestore = useFirestore();

  const projectsQuery = useMemo(
    () => (firestore ? collection(firestore, 'projects') : null),
    [firestore]
  );
  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

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
                <div className="font-medium">{project.name}</div>
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
                    <p><span className="font-medium text-foreground">Saldo:</span> {formatCurrency(project.balance)}</p>
                   <div className="flex items-center gap-2">
                       <span className="font-medium text-foreground">Progreso:</span>
                        <Progress value={project.progress} className="w-[100px]" />
                        <span>{project.progress}%</span>
                   </div>
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
                <AddProjectDialog project={project}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                </AddProjectDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
