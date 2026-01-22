'use client';

import { AccountingDashboard } from '@/components/contabilidad/accounting-dashboard';

export default function ContabilidadPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Dashboard de Contabilidad</h1>
      </div>
      <p className="text-muted-foreground">
        Análisis de información fiscal y de gastos para la liquidación de impuestos y toma de decisiones.
      </p>
      <AccountingDashboard />
    </div>
  );
}
