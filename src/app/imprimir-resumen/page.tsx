'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { WeeklySummaryPrint } from '@/components/imprimir-resumen/weekly-summary-print';

export default function ImprimirResumenPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Cargando...</div>}>
      <PrintContent />
    </Suspense>
  );
}

function PrintContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Faltan parámetros para generar el resumen.</p>
      </div>
    );
  }

  return <WeeklySummaryPrint startDate={startDate} endDate={endDate} />;
}
