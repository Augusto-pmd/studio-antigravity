'use client';

import { PaymentSchedule } from "@/components/calendario-pagos/payment-schedule";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function CalendarioPagosPage() {
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
      <div>
        <h1 className="text-3xl font-headline">Calendario de Pagos y Vencimientos</h1>
        <p className="mt-1 text-muted-foreground">
          Un resumen de todas sus obligaciones de pago y vencimientos de documentación.
        </p>
      </div>
      <PaymentSchedule />
    </div>
  );
}
