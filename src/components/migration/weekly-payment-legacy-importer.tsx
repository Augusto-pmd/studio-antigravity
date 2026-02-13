
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { ImportWeeklyPaymentDialog } from '@/components/pago-semanal/import-weekly-payment-dialog';

export function WeeklyPaymentLegacyImporter() {
    return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                    Importación Masiva (Multi-Hoja)
                </CardTitle>
                <CardDescription>
                    Importa planillas de Excel históricas.
                    <br />
                    El sistema detectará automáticamente las semanas basándose en los nombres de las hojas (ej. "01-02-2026").
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    <p className="font-semibold mb-2">Instrucciones:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Suba un único archivo Excel con múltiples hojas.</li>
                        <li>Cada hoja debe tener por nombre la fecha de inicio de la semana (dd-mm-yyyy).</li>
                        <li>La estructura de columnas se detectará automáticamente con IA.</li>
                        <li>Los datos existentes para las semanas detectadas serán reemplazados.</li>
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4 bg-muted/20">
                <ImportWeeklyPaymentDialog onSuccess={() => { }} />
            </CardFooter>
        </Card>
    );
}
