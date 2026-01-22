import { Button } from "@/components/ui/button";
import { ProjectsTable } from "@/components/obras/projects-table";
import { PlusCircle } from "lucide-react";

export default function ObrasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Obras</h1>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Obra
        </Button>
      </div>
      <ProjectsTable />
    </div>
  );
}
