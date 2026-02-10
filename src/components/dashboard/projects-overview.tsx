'use client';

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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, limit, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project } from "@/lib/types";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function ProjectsOverview() {
  const firestore = useFirestore();

  const projectsQuery = useMemo(
    () =>
      firestore
        ? query(
            collection(firestore, 'projects').withConverter(projectConverter),
            where('status', '==', 'En Curso'),
            limit(5)
          )
        : null,
    [firestore]
  );
  const { data: activeProjects, isLoading } = useCollection<Project>(projectsQuery);

  const renderSkeleton = () => (
    Array.from({ length: 2 }).map((_: any, i: number) => (
      <TableRow key={`skel-proj-${i}`}>
        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-headline">Obras Activas</CardTitle>
          <CardDescription>
            Un vistazo rápido a las obras actualmente en progreso.
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
            <Link href="/obras">Ver todas <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obra</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && renderSkeleton()}
            {!isLoading && activeProjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No hay obras activas en este momento.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && activeProjects.map((project: Project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">{project.client}</div>
                </TableCell>
                <TableCell>{project.supervisor}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      project.status === "En Curso" && "text-green-400 border-green-400",
                      project.status === "Pausado" && "text-yellow-400 border-yellow-400",
                    )}
                  >
                    {project.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
