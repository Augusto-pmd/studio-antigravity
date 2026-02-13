'use client';

import { DataImporter } from '@/components/migration/data-importer';
import { HistoricalRateBackfill } from '@/components/migration/historical-rate-backfill';

export default function MigrationPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Migración de Datos</h2>
                    <p className="text-muted-foreground">Herramienta de importación masiva desde Excel</p>
                </div>
            </div>
            <DataImporter />
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Herramientas Avanzadas</h3>
                <HistoricalRateBackfill />
            </div>
        </div>
    );
}
