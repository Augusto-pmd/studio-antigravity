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
import { Progress } from "@/components/ui/progress";
import { projects } from "@/lib/data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

export function ProjectsOverview() {
  const activeProjects = projects.filter(p => p.status === 'En Curso').slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
              <TableHead className="text-right">Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.map((project) => (
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
                      project.status === "En Curso" && "text-green-400 border-green-400",
                      project.status === "Pausado" && "text-yellow-400 border-yellow-400",
                    )}
                  >
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground w-10">{project.progress}%</span>
                        <Progress value={project.progress} className="w-[100px]" />
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
