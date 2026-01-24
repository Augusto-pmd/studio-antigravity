'use client';

import { AddProjectDialog } from "@/components/obras/add-project-dialog";
import { ProjectsTable } from "@/components/obras/projects-table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { PlusCircle } from "lucide-react";

export default function ObrasPage() {
  const { permissions } = useUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Obras</h1>
        {permissions.canManageProjects && (
          <AddProjectDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Obra
            </Button>
          </AddProjectDialog>
        )}
      </div>
      <p className="text-muted-foreground">
        Gestione todas las obras, sus presupuestos, estados y progreso.
      </p>
      <ProjectsTable />
    </div>
  );
}
