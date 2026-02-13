'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { WeeklyPaymentPrint } from '@/components/pago-semanal/weekly-payment-print';

export default function ImprimirPagoSemanalPage() {
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
                <p>Falta el identificador de la semana para generar la planilla.</p>
            </div>
        );
    }

    return <WeeklyPaymentPrint weekId={weekId} />;
}
