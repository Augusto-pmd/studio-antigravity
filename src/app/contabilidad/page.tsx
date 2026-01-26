'use client';

import { AccountingDashboard } from "@/components/contabilidad/accounting-dashboard";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function ContabilidadPage() {
  const { permissions } = useUser();

  if (!permissions.canValidate) {
    return (
      <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg font-medium text-muted-foreground">Acceso Denegado</p>
              <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
          </CardContent>
      </Card>
    )
  }

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
