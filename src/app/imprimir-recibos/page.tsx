'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PayrollReceipts } from '@/components/imprimir-recibos/payroll-receipts';

export default function ImprimirRecibosPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Cargando...</div>}>
      <ReceiptsContent />
    </Suspense>
  );
}

function ReceiptsContent() {
  const searchParams = useSearchParams();
  const weekId = searchParams.get('weekId');
  const type = searchParams.get('type') as 'employees' | 'contractors' | 'fund-requests' | null;

  if (!weekId || !type) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Faltan parámetros para generar los recibos.</p>
      </div>
    );
  }

  return <PayrollReceipts weekId={weekId} type={type} />;
}
