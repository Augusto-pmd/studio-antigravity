'use client';

import { ContractorDialog } from "@/components/contratistas/contractor-dialog";
import { ContractorsTable } from "@/components/contratistas/contractors-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ContratistasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Contratistas</h1>
        <ContractorDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Contratista
          </Button>
        </ContractorDialog>
      </div>
      <p className="text-muted-foreground">Registro de contratistas de servicios y control de documentación (ART/Seguros).</p>
      <ContractorsTable />
    </div>
  );
}
