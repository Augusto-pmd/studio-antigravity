'use client';

import { DataImporter } from '@/components/migration/data-importer';
import { HistoricalRateBackfill } from '@/components/migration/historical-rate-backfill';
import { WeeklyPaymentLegacyImporter } from '@/components/migration/weekly-payment-legacy-importer';

export default function MigrationPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Migración de Datos</h2>
                    <p className="text-muted-foreground">Herramientas de importación masiva</p>
                </div>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                <div className="space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Importación Legacy (Excel)</h3>
                        <WeeklyPaymentLegacyImporter />
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold mb-4">Herramientas Avanzadas</h3>
                        <HistoricalRateBackfill />
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Asistente de Importación (Copy/Paste)</h3>
                        <DataImporter />
                    </section>
                </div>
            </div>
        </div>
    );
}
