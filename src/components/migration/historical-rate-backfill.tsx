'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Expense } from '@/lib/types';

export function HistoricalRateBackfill() {
    const { firestore, permissions } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const fetchHistoricalRates = async () => {
        try {
            const response = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/blue');
            if (!response.ok) throw new Error('Failed to fetch rates');
            return await response.json();
        } catch (error) {
            console.error("Error fetching historical rates:", error);
            throw error;
        }
    };

    const handleBackfill = async () => {
        if (!firestore) return;
        setIsLoading(true);
        setProgress('Iniciando...');

        try {
            // 1. Fetch Expenses without historicalRate (or we can just update all ARS expenses)
            // Ideally check if currency is ARS
            const expensesRef = collection(firestore, 'projects/{projectId}/expenses');
            // Note: Collection Group query might be better if expenses are subcollections
            const expensesGroupRef = query(collection(firestore, 'expenses'), where('currency', '==', 'ARS'));
            // Wait, looking at types.ts/QuickExpense: collection(firestore, `projects/${projectId}/expenses`)
            // It is a subcollection. We need Collection Group Query or iterate projects.
            // Let's use collectionGroup if index exists (it might fail if not indexed).
            // Safer: iterate projects.

            setProgress('Obteniendo proyectos...');
            const projectsSnap = await getDocs(collection(firestore, 'projects'));
            const projectIds = projectsSnap.docs.map(d => d.id);

            setProgress('Obteniendo tipos de cambio históricos...');
            const historicalData = await fetchHistoricalRates();
            // Map: "YYYY-MM-DD" -> rate
            const rateMap = new Map<string, number>();
            let latestDate = '';
            let latestRate = 0;

            historicalData.forEach((entry: any) => {
                // Entry usually has fecha and venta
                if (entry.fecha && entry.venta) {
                    rateMap.set(entry.fecha, entry.venta);
                    if (!latestDate || entry.fecha > latestDate) {
                        latestDate = entry.fecha;
                        latestRate = entry.venta;
                    }
                }
            });

            let totalUpdated = 0;
            let batch = writeBatch(firestore);
            let operationCount = 0;

            for (const projectId of projectIds) {
                setProgress(`Procesando proyecto ${projectId}...`);
                const expensesRef = collection(firestore, `projects/${projectId}/expenses`);
                const expensesSnap = await getDocs(expensesRef);

                for (const docSnap of expensesSnap.docs) {
                    const expense = docSnap.data() as Expense;

                    // Update if ARS and rate is missing, 0, 1, or very low (incorrect)
                    // This covers the "Personal Propio" case if it was created with rate 1.
                    if (expense.currency === 'ARS' && (expense.exchangeRate === undefined || expense.exchangeRate <= 5)) {
                        const dateKey = format(parseISO(expense.date), 'yyyy-MM-dd');
                        let rate = rateMap.get(dateKey);

                        // If exact date match fails, maybe look for closest? 
                        // For now, let's stick to exact match or previous known.
                        // Simple fallback: if no rate for Sunday, look for Saturday, etc.
                        if (!rate) {
                            // Try -1 day, -2 days... up to a week
                            for (let i = 1; i <= 7; i++) {
                                const d = new Date(dateKey);
                                d.setDate(d.getDate() - i);
                                const prevDateKey = format(d, 'yyyy-MM-dd');
                                rate = rateMap.get(prevDateKey);
                                if (rate) break;
                            }
                        }

                        // NEW: Fallback to latest available rate if still no rate (e.g. future dates or gaps > 7 days)
                        // This handles the "01/02/2026" case where API might not have data yet (if today is before that)
                        // OR if the API only has data up to 2024.
                        if (!rate) {
                            if (latestRate > 0) {
                                rate = latestRate;
                            } else {
                                // As a last resort, use the latest found.
                                rate = latestRate;
                            }
                        }

                        if (rate && rate > 5) { // Ensure we don't accidentally set a low rate
                            // Check if update is needed
                            if (expense.exchangeRate !== rate) {
                                console.log(`Updating expense ${docSnap.id} (${expense.description}) date ${dateKey}: ${expense.exchangeRate} -> ${rate}`);
                                batch.update(docSnap.ref, { exchangeRate: rate });
                                operationCount++;
                                totalUpdated++;

                                if (operationCount >= 400) {
                                    await batch.commit();
                                    batch = writeBatch(firestore);
                                    operationCount = 0;
                                }
                            }
                        }
                    }
                }
            }

            if (operationCount > 0) {
                await batch.commit();
            }

            toast({ title: 'Proceso Finalizado', description: `Se actualizaron ${totalUpdated} gastos con tasas históricas.` });

        } catch (error) {
            console.error("Backfill error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error durante la migración.' });
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    if (!permissions.canSupervise) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actualización de Tasas Históricas</CardTitle>
                <CardDescription>
                    Asigna el valor del Dólar Blue histórico a los gastos en pesos para reportes en USD.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Esta herramienta escaneará <strong>TODO el sistema</strong> (Proyectos y Solicitudes de Fondos).
                        Buscará todos los movimientos en <strong>Pesos (ARS)</strong> y <strong>SOBRESCRIBIRÁ</strong> el "Tipo de Cambio" con el valor histórico del Dólar Blue (Venta) correspondiente a la fecha del comprobante.
                    </p>
                    {progress && <p className="text-sm font-medium text-blue-600">{progress}</p>}
                    <Button onClick={handleBackfill} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Ejecutar Actualización
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
