'use client';

import { AddProjectDialog } from "@/components/obras/add-project-dialog";
import { ProjectsTable } from "@/components/obras/projects-table";
import { useUser } from "@/firebase";
import { PlusCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";

export default function ObrasPage() {
  const { permissions } = useUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Obras</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione todas las obras, sus presupuestos, estados y progreso.
          </p>
        </div>
        {permissions.canManageProjects && (
          <AddProjectDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Obra
            </Button>
          </AddProjectDialog>
        )}
      </div>
      <ErrorBoundary>
        <ProjectsTable />
      </ErrorBoundary>
    </div>
  );
}
