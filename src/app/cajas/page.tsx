import { CashAccountsDashboard } from "@/components/cajas/cash-accounts-dashboard";

export default function CajasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Cajas de Usuarios</h1>
          <p className="mt-1 text-muted-foreground">
            Supervise los saldos y movimientos de las cajas de efectivo de los usuarios del sistema.
          </p>
        </div>
      </div>
      <CashAccountsDashboard />
    </div>
  );
}
