import { AccountingDashboard } from "@/components/contabilidad/accounting-dashboard";

export default function ContabilidadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Módulo de Contabilidad</h1>
      </div>
       <p className="text-muted-foreground">
        Gestione las cuentas por pagar/cobrar, planes de pago, y visualice resúmenes de impuestos y reportes.
      </p>
      <AccountingDashboard />
    </div>
  );
}
