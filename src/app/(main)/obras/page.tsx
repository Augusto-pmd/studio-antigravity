import { AddProjectDialog } from "@/components/obras/add-project-dialog";
import { ProjectsTable } from "@/components/obras/projects-table";

export default function ObrasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Obras</h1>
        <AddProjectDialog />
      </div>
      <ProjectsTable />
    </div>
  );
}
