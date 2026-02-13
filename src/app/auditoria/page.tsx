'use client';

import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { AuditDashboard } from "@/components/auditoria/audit-dashboard";

export default function AuditoriaPage() {
  const { permissions } = useUser();

  if (!permissions.isSuperAdmin) {
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
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Centro de Control</h1>
          <p className="mt-1 text-muted-foreground">
            Monitoreo en tiempo real de la actividad del personal y seguridad.
          </p>
        </div>
      </div>
      <AuditDashboard />
    </div>
  );
}
