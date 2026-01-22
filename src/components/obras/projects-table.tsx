"use client";

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
import { projects } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export function ProjectsTable() {
  return (
    <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Obra</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Saldo Contrato</TableHead>
              <TableHead className="w-[200px] text-right">Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project: Project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">{project.id}</div>
                </TableCell>
                <TableCell>{project.supervisor}</TableCell>
                <TableCell>
                   <Badge
                    variant="outline"
                    className={cn(
                        "capitalize",
                        project.status === "En Curso" && "bg-green-900/40 text-green-300 border-green-700",
                        project.status === "Pausado" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                        project.status === "Completado" && "bg-blue-900/40 text-blue-300 border-blue-700",
                        project.status === "Cancelado" && "bg-red-900/40 text-red-300 border-red-700",
                    )}
                  >
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(project.balance)}</TableCell>
                <TableCell>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground w-10 text-right">{project.progress}%</span>
                        <Progress value={project.progress} className="w-[100px]" />
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
