import { CashAccountsDashboard } from "@/components/cajas/cash-accounts-dashboard";

export default function CajasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Cajas de Usuarios</h1>
      </div>
      <p className="text-muted-foreground">
        Supervise los saldos y movimientos de las cajas de efectivo de los usuarios del sistema.
      </p>
      <CashAccountsDashboard />
    </div>
  );
}
