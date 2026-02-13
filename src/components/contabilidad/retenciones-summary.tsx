'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ClipboardMinus } from 'lucide-react';

const formatCurrency = (amount: number | undefined) => {
  if (typeof amount !== 'number') return '$ 0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

export function RetencionesSummary({
  retGanancias,
  retIva,
  retIibb,
  retSuss,
}: {
  retGanancias: number;
  retIva: number;
  retIibb: number;
  retSuss: number;
}) {
  const totalRetenciones = retGanancias + retIva + retIibb + retSuss;

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline">Retenciones y Cargas Sociales</CardTitle>
            <CardDescription>
              Fondos retenidos en pagos a proveedores, pendientes de depósito en AFIP y otros organismos.
            </CardDescription>
          </div>
          <ClipboardMinus className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Retenido y Aportes a Pagar</p>
          <p className="text-2xl font-bold font-mono text-destructive">
            {formatCurrency(totalRetenciones)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Ret. Ganancias (a Prov.):</span>
              <span className="font-mono">{formatCurrency(retGanancias)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Ret. IVA:</span>
              <span className="font-mono">{formatCurrency(retIva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ret. IIBB:</span>
              <span className="font-mono">{formatCurrency(retIibb)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ret. SUSS:</span>
              <span className="font-mono">{formatCurrency(retSuss)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
