'use client';

import { useState, useMemo, useEffect } from 'react';
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, getDocs, limit, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { FundRequest, PayrollWeek } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklySummary } from '@/components/asistencias/weekly-summary';
import { CashAdvances } from '@/components/asistencias/cash-advances';
import { DailyAttendance } from '@/components/asistencias/daily-attendance';
import { ContractorCertifications } from '@/components/pago-semanal/contractor-certifications';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Printer, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { payrollWeekConverter } from '@/lib/converters';
import { getHistoricalRate } from "@/lib/exchange-rate";


const fundRequestConverter = {
    toFirestore(request: FundRequest): DocumentData {
        const { id, ...data } = request;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): FundRequest {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            requesterId: data.requesterId,
            requesterName: data.requesterName,
            date: data.date,
            category: data.category,
            projectId: data.projectId,
            projectName: data.projectName,
            amount: data.amount,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            status: data.status,
            description: data.description,
        };
    }
};

export default function PagoSemanalPage() {
    const { user, firestore, permissions } = useUser();
    const isAdmin = permissions.canSupervise;
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekExchangeRate, setWeekExchangeRate] = useState('');
    const [isSavingRate, setIsSavingRate] = useState(false);

    const weekStartDateString = useMemo(() => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd');
    }, [selectedDate]);

    const weekQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter),
            where('startDate', '==', weekStartDateString),
            limit(1)
        );
    }, [firestore, weekStartDateString]);

    const { data: weeks, isLoading: isLoadingCurrentWeek } = useCollection<PayrollWeek>(weekQuery);

    const currentWeek = useMemo(() => (weeks && weeks.length > 0 ? weeks[0] : null), [weeks]);

    // Effect for creating the week if it doesn't exist
    useEffect(() => {
        if (!firestore || !isAdmin || isLoadingCurrentWeek || (weeks && weeks.length > 0)) return;

        const createWeek = async () => {
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
            const newWeekRef = doc(collection(firestore, 'payrollWeeks'));

            const newWeekData: Omit<PayrollWeek, 'id' | 'exchangeRate'> & { exchangeRate?: number } = {
                startDate: format(weekStart, 'yyyy-MM-dd'),
                endDate: format(weekEnd, 'yyyy-MM-dd'),
            };

            try {
                await setDoc(newWeekRef, newWeekData);
            } catch (error) {
                console.error("Error creating week:", error);
                toast({
                    variant: "destructive",
                    title: "Error al crear la semana",
                    description: "No se pudo crear la semana de pagos."
                });
            }
        };

        createWeek();
    }, [firestore, isAdmin, isLoadingCurrentWeek, weeks, selectedDate, toast]);

    // Effect to update the input field when currentWeek changes
    useEffect(() => {
        if (currentWeek) {
            // First try to use the stored rate
            if (currentWeek.exchangeRate) {
                setWeekExchangeRate(currentWeek.exchangeRate.toString());
            } else {
                // If no rate is stored, fetch historical rate for the end of the week (Friday usually)
                const fetchRate = async () => {
                    const date = parseISO(currentWeek.endDate);
                    const rate = await getHistoricalRate(date);
                    if (rate > 0) {
                        setWeekExchangeRate(rate.toString());
                        // Optional: Auto-save it?
                        // For now we just populate the input. User clicks "Guardar".
                        // Actually, user wants to remove manual load. So maybe auto-save?
                        // Let's just pre-fill it for now.
                    }
                };
                fetchRate();
            }
        } else {
            setWeekExchangeRate('');
        }
    }, [currentWeek]);


    const allFundRequestsQuery = useMemo(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), orderBy('date', 'desc'));

        if (!isAdmin && user) {
            q = query(q, where('requesterId', '==', user.uid));
        }

        return q;
    }, [firestore, user, isAdmin]);

    const { data: allRequests, isLoading: isLoadingRequests } = useCollection<FundRequest>(allFundRequestsQuery);

    const requests = useMemo(() => {
        if (!allRequests || !currentWeek) return [];
        const weekStart = parseISO(currentWeek.startDate);
        const weekEnd = parseISO(currentWeek.endDate);
        weekEnd.setHours(23, 59, 59, 999); // Include the whole last day

        return allRequests.filter((req: FundRequest) => {
            if (!req.date) return false;
            try {
                const reqDate = parseISO(req.date);
                return reqDate >= weekStart && reqDate <= weekEnd;
            } catch (e) {
                console.error(`Invalid date format for fund request ${req.id}: ${req.date}`);
                return false;
            }
        });
    }, [allRequests, currentWeek]);

    const handleUpdateExchangeRate = async () => {
        if (!firestore || !currentWeek) return;
        const rate = parseFloat(weekExchangeRate);
        if (isNaN(rate) || rate <= 0) {
            toast({ variant: 'destructive', title: 'Tipo de cambio inválido', description: 'El tipo de cambio debe ser un número positivo.' });
            return;
        }

        setIsSavingRate(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Update the Payroll Week
            const weekRef = doc(firestore, 'payrollWeeks', currentWeek.id);
            batch.update(weekRef, { exchangeRate: rate });

            // 2. Update Global Settings
            const settingsRef = doc(firestore, 'settings', 'general');
            batch.set(settingsRef, {
                exchangeRate: rate,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            await batch.commit();

            toast({ title: 'Tipo de cambio guardado', description: `Se aplicará una tasa de ${rate} a esta semana y al sistema global.` });
        } catch (error) {
            console.error("Error updating exchange rate:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo actualizar el tipo de cambio.' });
        } finally {
            setIsSavingRate(false);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-headline">Gestión de Pago Semanal</h1>
                    <p className="mt-1 text-muted-foreground">
                        Consolide la planilla de pagos de personal y las solicitudes de fondos para la semana.
                    </p>
                </div>
                <Button asChild disabled={!currentWeek}>
                    <Link href={currentWeek ? `/imprimir-pago-semanal?weekId=${currentWeek.id}` : '#'} target="_blank">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Planilla de Pagos
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Selector de Semana</CardTitle>
                        <CardDescription>Elija una fecha para ver o cargar datos de esa semana.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'outline'}
                                className={cn('w-full justify-start text-left font-normal text-lg', !selectedDate && 'text-muted-foreground')}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {currentWeek ? (
                                    <span>{format(parseISO(currentWeek.startDate), 'dd/MM/yy', { locale: es })} al {format(parseISO(currentWeek.endDate), 'dd/MM/yy', { locale: es })}</span>
                                ) : (
                                    <span>Seleccione una fecha</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="week-exchange-rate">Tipo de Cambio Semanal (USD)</Label>
                            <Input
                                id="week-exchange-rate"
                                type="number"
                                placeholder="Ej. 900"
                                value={weekExchangeRate}
                                onChange={(e) => setWeekExchangeRate(e.target.value)}
                                disabled={!currentWeek || !isAdmin}
                            />
                            <p className="text-xs text-muted-foreground">Este tipo de cambio se usará para calcular el costo en USD de la mano de obra.</p>
                        </div>
                        <Button onClick={handleUpdateExchangeRate} disabled={!currentWeek || isSavingRate || !isAdmin || !weekExchangeRate}>
                            {isSavingRate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambio
                        </Button>
                    </div>
                </CardContent>
            </Card>


            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
                    <TabsTrigger value="personal">Planilla (Personal)</TabsTrigger>
                    <TabsTrigger value="contratistas">Certificaciones (Contratistas)</TabsTrigger>
                    <TabsTrigger value="solicitudes">Solicitudes de Fondos</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-6">
                    <div className="flex flex-col gap-6">
                        <WeeklySummary
                            currentWeek={currentWeek}
                            isLoadingCurrentWeek={isLoadingCurrentWeek}
                        />
                        <CashAdvances
                            currentWeek={currentWeek ?? undefined}
                            isLoadingWeek={isLoadingCurrentWeek}
                        />
                        <DailyAttendance
                            currentWeek={currentWeek ?? undefined}
                            isLoadingWeek={isLoadingCurrentWeek}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="contratistas" className="mt-6">
                    <ContractorCertifications
                        currentWeek={currentWeek ?? undefined}
                        isLoadingWeek={isLoadingCurrentWeek}
                    />
                </TabsContent>

                <TabsContent value="solicitudes" className="mt-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold">Solicitudes de Fondos</h2>
                                <p className="mt-1 text-muted-foreground">
                                    Cree y supervise las solicitudes de dinero para gastos de la semana.
                                </p>
                            </div>
                            <RequestFundDialog />
                        </div>
                        <FundRequestsTable requests={requests} isLoading={isLoadingRequests} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
