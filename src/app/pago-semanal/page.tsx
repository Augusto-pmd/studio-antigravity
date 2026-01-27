'use client';

import { useMemo } from 'react';
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where, type QueryDocumentSnapshot, type SnapshotOptions, type DocumentData, limit, orderBy } from "firebase/firestore";
import type { FundRequest, PayrollWeek } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklySummary } from '@/components/asistencias/weekly-summary';
import { CashAdvances } from '@/components/asistencias/cash-advances';
import { DailyAttendance } from '@/components/asistencias/daily-attendance';

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
    
    const fundRequestsQuery = useMemo(() => {
        if (!firestore) return null;
        const coll = collection(firestore, 'fundRequests').withConverter(fundRequestConverter);
        // Admins and supervisors see all requests. Other roles only see their own.
        if (isAdmin) {
          return query(coll);
        }
        if (user) {
          return query(coll, where('requesterId', '==', user.uid));
        }
        return null;
      }, [firestore, user, isAdmin]);

    const { data: requests, isLoading: isLoadingRequests } = useCollection<FundRequest>(fundRequestsQuery);

    const openWeekQuery = useMemo(() =>
        firestore
        ? query(collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter), where('status', '==', 'Abierta'), limit(1))
        : null,
        [firestore]
    );
    const { data: openWeeks, isLoading: isLoadingOpenWeek } = useCollection<PayrollWeek>(openWeekQuery);
    const currentWeek = useMemo(() => openWeeks?.[0], [openWeeks]);

    const historicalWeeksQuery = useMemo(() =>
        firestore
        ? query(collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter), where('status', '==', 'Cerrada'), orderBy('startDate', 'desc'))
        : null,
        [firestore]
    );
    const { data: historicalWeeks, isLoading: isLoadingHistoricalWeeks } = useCollection<PayrollWeek>(historicalWeeksQuery);


  return (
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-3xl font-headline">Gestión de Pago Semanal</h1>
            <p className="mt-1 text-muted-foreground">
                Consolide la planilla de pagos de personal y las solicitudes de fondos para la semana.
            </p>
        </div>

        <Tabs defaultValue="planilla" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="planilla">Planilla de Pagos (Personal)</TabsTrigger>
                <TabsTrigger value="solicitudes">Solicitudes de Fondos</TabsTrigger>
            </TabsList>
            <TabsContent value="planilla" className="mt-6">
                <div className="flex flex-col gap-6">
                    <WeeklySummary 
                        currentWeek={currentWeek}
                        historicalWeeks={historicalWeeks || []}
                        isLoadingWeeks={isLoadingOpenWeek || isLoadingHistoricalWeeks}
                    />
                    <CashAdvances 
                        currentWeek={currentWeek} 
                        isLoadingWeek={isLoadingOpenWeek} 
                    />
                    <DailyAttendance 
                        currentWeek={currentWeek} 
                        isLoadingWeek={isLoadingOpenWeek} 
                    />
                </div>
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
