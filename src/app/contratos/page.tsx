'use client';

import { ContractDialog } from "@/components/contratos/contract-dialog";
import { ContractsTable } from "@/components/contratos/contracts-table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { PlusCircle } from "lucide-react";

export default function ContratosPage() {
  const { permissions } = useUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Contratos de Venta</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione los contratos con clientes. Esto afectará el "IVA Débito Fiscal" en contabilidad.
          </p>
        </div>
        {permissions.isSuperAdmin && (
          <ContractDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          </ContractDialog>
        )}
      </div>
      <ContractsTable />
    </div>
  );
}
