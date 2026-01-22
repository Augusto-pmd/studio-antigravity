import { CashAccountsDashboard } from "@/components/cajas/cash-accounts-dashboard";

export default function CajasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Cajas</h1>
      </div>
      <p className="text-muted-foreground">
        Administre las cajas de los usuarios, vea saldos y realice refuerzos de fondos.
      </p>
      <CashAccountsDashboard />
    </div>
  );
}

    