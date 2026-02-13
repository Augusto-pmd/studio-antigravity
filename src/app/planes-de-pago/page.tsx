import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PlanDePagoDialog } from "@/components/planes-de-pago/plan-de-pago-dialog";
import { PlanesDePagoTable } from "@/components/planes-de-pago/planes-de-pago-table";

export default function PlanesDePagoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Planes de Pago (Moratorias)</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione los planes de facilidades de pago de impuestos con AFIP.
          </p>
        </div>
        <PlanDePagoDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Plan de Pago
          </Button>
        </PlanDePagoDialog>
      </div>
      <PlanesDePagoTable />
    </div>
  );
}
