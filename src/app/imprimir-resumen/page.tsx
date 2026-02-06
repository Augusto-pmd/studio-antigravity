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
  const weekId = searchParams.get('weekId');

  if (!weekId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Falta el identificador de la semana para generar el resumen.</p>
      </div>
    );
  }

  return <WeeklySummaryPrint weekId={weekId} />;
}
