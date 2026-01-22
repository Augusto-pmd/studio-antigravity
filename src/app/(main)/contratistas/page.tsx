import { AddContractorDialog } from "@/components/contratistas/add-contractor-dialog";
import { ContractorsTable } from "@/components/contratistas/contractors-table";

export default function ContratistasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Contratistas</h1>
        <AddContractorDialog />
      </div>
      <p className="text-muted-foreground">Registro de contratistas de servicios y control de documentación (ART/Seguros).</p>
      <ContractorsTable />
    </div>
  );
}
