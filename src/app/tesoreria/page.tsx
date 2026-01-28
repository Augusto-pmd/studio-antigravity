'use client';

import { TreasuryAccounts } from "@/components/tesoreria/treasury-accounts";
import { TreasuryDashboard } from "@/components/tesoreria/treasury-dashboard";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function TesoreriaPage() {
  const { permissions } = useUser();

  if (!permissions.isSuperAdmin) {
    return (
      <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg font-medium text-muted-foreground">Acceso Denegado</p>
              <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
          </CardContent>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-headline">Tesorería</h1>
        <p className="text-muted-foreground">
            Administre las cuentas, visualice saldos y explore el flujo de dinero de la empresa.
        </p>
      </div>
      <TreasuryAccounts />
      <TreasuryDashboard />
    </div>
  );
}
