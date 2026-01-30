'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where, orderBy, doc, getDocs, setDoc, limit, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { FundRequest, PayrollWeek } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklySummary } from '@/components/asistencias/weekly-summary';
import { CashAdvances } from '@/components/asistencias/cash-advances';
import { DailyAttendance } from '@/components/asistencias/daily-attendance';
import { ContractorCertifications } from '@/components/pago-semanal/contractor-certifications';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


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

const payrollWeekConverter = {
    toFirestore: (data: PayrollWeek): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => ({ ...snapshot.data(options), id: snapshot.id } as PayrollWeek)
};


export default function PagoSemanalPage() {
    const { user, firestore, permissions } = useUser();
    const isAdmin = permissions.canSupervise;
    const { toast } = useToast();
    
    const [selectedDate, setSelectedDate] = useState<Date>(new Date('2026-01-30T12:00:00.000Z'));
    const [currentWeek, setCurrentWeek] = useState<PayrollWeek | null>(null);
    const [isLoadingWeek, setIsLoadingWeek] = useState(true);
    const [isCreatingWeek, startTransition] = useTransition();

    useEffect(() => {
        if (!firestore) return;

        const loadWeek = async () => {
            setIsLoadingWeek(true);
            // Monday is the start of the week
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekStartISO = weekStart.toISOString();

            const q = query(
                collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter),
                where('startDate', '==', weekStartISO),
                limit(1)
            );
            const weekSnapshot = await getDocs(q);

            if (!weekSnapshot.empty) {
                setCurrentWeek(weekSnapshot.docs[0].data() as PayrollWeek);
            } else {
                const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
                // Create a virtual week object if it doesn't exist in Firestore
                const virtualWeek: PayrollWeek = {
                    id: `virtual_${weekStartISO}`,
                    startDate: weekStartISO,
                    endDate: weekEnd.toISOString(),
                    status: 'Abierta',
                    generatedAt: new Date().toISOString(),
                };
                setCurrentWeek(virtualWeek);
            }
            setIsLoadingWeek(false);
        };
        loadWeek();
    }, [selectedDate, firestore]);

    const handleCreateWeek = async () => {
        if (!firestore || !currentWeek || !currentWeek.id.startsWith('virtual_')) return;

        startTransition(async () => {
            try {
                const openWeekQuery = query(collection(firestore, 'payrollWeeks'), where('status', '==', 'Abierta'), limit(1));
                const openWeekSnap = await getDocs(openWeekQuery);
                if (!openWeekSnap.empty) {
                    toast({
                        variant: "destructive",
                        title: "Semana Abierta Existente",
                        description: `Ya existe una semana abierta. Debe cerrarla antes de generar una nueva.`,
                    });
                    return;
                }

                const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
                const newWeekData: PayrollWeek = {
                    id: newWeekRef.id,
                    startDate: currentWeek.startDate,
                    endDate: currentWeek.endDate,
                    status: 'Abierta',
                    generatedAt: new Date().toISOString(),
                };

                await setDoc(newWeekRef, newWeekData);
                setCurrentWeek(newWeekData);
                toast({
                    title: "Nueva Semana Generada",
                    description: `La semana ha sido creada y ahora está activa.`,
                });
            } catch (error) {
                console.error("Error creating week:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la semana.' });
            }
        });
    };

     const fundRequestsQuery = useMemo(() => {
        if (!firestore) return null;
        
        let q = query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), orderBy('date', 'desc'));

        if (!isAdmin && user) {
          q = query(q, where('requesterId', '==', user.uid));
        }
        
        return q;
      }, [firestore, user, isAdmin]);

    const { data: requests, isLoading: isLoadingRequests } = useCollection<FundRequest>(fundRequestsQuery);

  return (
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-3xl font-headline">Gestión de Pago Semanal</h1>
            <p className="mt-1 text-muted-foreground">
                Consolide la planilla de pagos de personal y las solicitudes de fondos para la semana.
            </p>
        </div>

        <Card>
            <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Selector de Semana</CardTitle>
                    <CardDescription>Elija una fecha para ver o cargar datos de esa semana.</CardDescription>
                </div>
                {currentWeek?.id.startsWith('virtual_') && permissions.canSupervise && (
                    <Button onClick={handleCreateWeek} disabled={isCreatingWeek}>
                        {isCreatingWeek ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Generar y Abrir Semana
                    </Button>
                )}
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
                            <span>{format(parseISO(currentWeek.startDate), 'dd/MM/yy', {locale: es})} al {format(parseISO(currentWeek.endDate), 'dd/MM/yy', {locale: es})}</span>
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
                        isLoadingCurrentWeek={isLoadingWeek}
                    />
                    <CashAdvances 
                        currentWeek={currentWeek ?? undefined} 
                        isLoadingWeek={isLoadingWeek} 
                    />
                    <DailyAttendance 
                        currentWeek={currentWeek ?? undefined} 
                        isLoadingWeek={isLoadingWeek} 
                    />
                </div>
            </TabsContent>

            <TabsContent value="contratistas" className="mt-6">
              <ContractorCertifications 
                currentWeek={currentWeek ?? undefined}
                isLoadingWeek={isLoadingWeek}
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
