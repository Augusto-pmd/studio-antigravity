import { Button } from "@/components/ui/button";
import { ContractorDialog } from "@/components/contratistas/contractor-dialog";
import { ContractorsTable } from "@/components/contratistas/contractors-table";
import { PlusCircle } from "lucide-react";

export default function ContratistasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Contratistas</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione la información y documentación de los contratistas que prestan servicios.
          </p>
        </div>
        <ContractorDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Contratista
            </Button>
        </ContractorDialog>
      </div>
      <ContractorsTable />
    </div>
  );
}
