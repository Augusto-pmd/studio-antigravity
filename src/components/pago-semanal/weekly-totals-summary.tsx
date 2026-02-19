'use client';

import { useMemo, useCallback } from 'react';
import { useUser, useCollection } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, ContractorCertification, FundRequest, DailyWageHistory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HardHat, Handshake, Briefcase, TrendingUp } from 'lucide-react';
import { parseISO } from 'date-fns';
import {
    attendanceConverter,
    cashAdvanceConverter,
    certificationConverter,
    fundRequestConverter,
    employeeConverter,
    dailyWageHistoryConverter,
    parseNumber,
} from '@/lib/converters';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

interface WeeklyTotalsSummaryProps {
    currentWeek?: PayrollWeek | null;
    isLoadingWeek: boolean;
    /** Fund requests already filtered to this week, passed from parent to avoid double fetch */
    weekFundRequests?: FundRequest[];
    isLoadingRequests?: boolean;
}

export function WeeklyTotalsSummary({
    currentWeek,
    isLoadingWeek,
    weekFundRequests,
    isLoadingRequests = false,
}: WeeklyTotalsSummaryProps) {
    const { firestore, permissions } = useUser();

    // Personal
    const attendancesQuery = useMemo(
        () => firestore && currentWeek
            ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id))
            : null,
        [firestore, currentWeek]
    );
    const { data: attendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendancesQuery);

    const employeesQuery = useMemo(
        () => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter), where('status', '==', 'Activo')) : null,
        [firestore]
    );
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const wageHistoriesQuery = useMemo(
        () => firestore && permissions.canSupervise
            ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter)
            : null,
        [firestore, permissions.canSupervise]
    );
    const { data: wageHistories, isLoading: isLoadingWages } = useCollection(wageHistoriesQuery);

    // Adelantos de la semana
    const advancesQuery = useMemo(
        () => firestore && currentWeek
            ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id))
            : null,
        [firestore, currentWeek]
    );
    const { data: weekAdvances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);

    // Contratistas
    const certsQuery = useMemo(
        () => firestore && currentWeek
            ? query(
                collection(firestore, 'contractorCertifications').withConverter(certificationConverter),
                where('payrollWeekId', '==', currentWeek.id),
                where('status', 'in', ['Pendiente', 'Aprobado', 'Pagado'])
            )
            : null,
        [firestore, currentWeek]
    );
    const { data: certifications, isLoading: isLoadingCerts } = useCollection<ContractorCertification>(certsQuery);

    const isLoading =
        isLoadingWeek ||
        isLoadingAttendances ||
        isLoadingEmployees ||
        isLoadingWages ||
        isLoadingAdvances ||
        isLoadingCerts ||
        isLoadingRequests;

    const getWageForDate = useCallback(
        (employeeId: string, date: string): { wage: number; hourlyRate: number } => {
            const employee = employees?.find((e) => e.id === employeeId);
            const fallback = employee?.dailyWage || 0;
            if (!wageHistories) return { wage: fallback, hourlyRate: fallback / 8 };

            const histories = wageHistories
                .filter((h) => (h as any).employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
                .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

            const wage = histories.length > 0 ? histories[0].amount : fallback;
            return { wage, hourlyRate: wage / 8 };
        },
        [wageHistories, employees]
    );

    const totals = useMemo(() => {
        if (isLoading || !currentWeek) return null;

        // --- Personal ---
        let grossWages = 0;
        let lateHoursDeduction = 0;
        (attendances || []).forEach((att: Attendance) => {
            if (att.status === 'presente') {
                const { wage, hourlyRate } = getWageForDate(att.employeeId, att.date);
                grossWages += wage;
                if (parseNumber(att.lateHours) > 0) {
                    lateHoursDeduction += parseNumber(att.lateHours) * hourlyRate;
                }
            }
        });
        const totalAdvances = (weekAdvances || []).reduce((sum, adv: CashAdvance) => {
            return sum + adv.amount / (adv.installments || 1);
        }, 0);
        const totalPersonal = grossWages - totalAdvances - lateHoursDeduction;

        // --- Contratistas ---
        const weeklyRate = currentWeek?.exchangeRate;
        const totalContratistas = (certifications || []).reduce((sum, cert: ContractorCertification) => {
            const amount = cert.currency === 'USD' ? cert.amount * (weeklyRate || 1) : cert.amount;
            return sum + amount;
        }, 0);

        // --- Solicitudes de Fondos ---
        const totalSolicitudes = (weekFundRequests || []).reduce((sum, req: FundRequest) => {
            const amount = req.currency === 'USD' ? req.amount * (weeklyRate || req.exchangeRate || 1) : req.amount;
            return sum + amount;
        }, 0);

        const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
        return { totalPersonal, totalContratistas, totalSolicitudes, grandTotal };
    }, [isLoading, currentWeek, attendances, weekAdvances, certifications, weekFundRequests, getWageForDate]);

    if (isLoadingWeek || !currentWeek) return null;

    const cards = [
        { label: 'Total Personal', value: totals?.totalPersonal ?? 0, icon: HardHat, color: 'text-blue-600' },
        { label: 'Total Contratistas', value: totals?.totalContratistas ?? 0, icon: Handshake, color: 'text-purple-600' },
        { label: 'Total Solicitudes', value: totals?.totalSolicitudes ?? 0, icon: Briefcase, color: 'text-orange-600' },
    ];

    return (
        <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Resumen de la Semana
                </CardTitle>
                {!isLoading && totals && (
                    <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totals.grandTotal)}
                    </span>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {cards.map((card) => (
                            <div key={card.label} className="flex flex-col gap-1 rounded-lg border bg-background p-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                                    {card.label}
                                </div>
                                <p className="text-xl font-bold font-mono">{formatCurrency(card.value)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
