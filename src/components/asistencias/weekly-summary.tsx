'use client';

import { useMemo, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, collectionGroup } from "firebase/firestore";
import type { PayrollWeek, Employee, Attendance, CashAdvance, DailyWageHistory } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { employeeConverter, attendanceConverter, cashAdvanceConverter, parseNumber, dailyWageHistoryConverter } from "@/lib/converters";


const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function WeeklySummary({ currentWeek, isLoadingCurrentWeek }: { currentWeek?: PayrollWeek | null, isLoadingCurrentWeek: boolean }) {
    const { firestore, permissions } = useUser();

    const attendancesQuery = useMemo(
        () => firestore && currentWeek ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null,
        [firestore, currentWeek]
    );
    const { data: weekAttendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendancesQuery);

    const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter), where('status', '==', 'Activo')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    // Fetch ALL advances for the employee to check for active installments
    // We need all advances that might have pending installments.
    // Ideally we filter by date, but since we don't know the exact range without querying, we can fetch year's advances or similar.
    // For now, let's fetch all (assuming volume isn't huge yet) or filter by project/employee if possible.
    // BETTER: Filter by payrollWeekId is too restrictive. 
    // We will fetch ALL advances for the employees in the current week.
    // Actually, to display "Total Advances" for the week, we need to calculate:
    // 1. New advances given THIS week (full amount? No, usually just the installment amount if we want to balance it out... 
    //    WAIT. If I give 10000 in 10 installments.
    //    Does the employee receive 10000 cash now? YES.
    //    Does the employee pay back 1000 now? YES.
    //    So Net = Wages - 1000.
    //    The "Total Advances" in the summary usually refers to "Deductions for Advances".
    const advancesQuery = useMemo(
        () => firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter)) : null,
        [firestore]
    );
    const { data: allAdvances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);

    const wageHistoriesQuery = useMemo(() => (firestore && permissions.canSupervise ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore, permissions.canSupervise]);
    const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);

    const isLoadingSummaryData = isLoadingAttendances || isLoadingEmployees || isLoadingAdvances || isLoadingWageHistories;

    const getWageForDate = useCallback((employeeId: string, date: string): { wage: number, hourlyRate: number } => {
        const employee = employees?.find(e => e.id === employeeId);
        if (!wageHistories) {
            const wage = employee?.dailyWage || 0;
            return { wage, hourlyRate: wage / 8 };
        }

        const histories = wageHistories
            .filter(h => (h as any).employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

        if (histories.length > 0) {
            const wage = histories[0].amount;
            return { wage, hourlyRate: wage / 8 };
        }

        const wage = employee?.dailyWage || 0;
        return { wage, hourlyRate: wage / 8 };
    }, [wageHistories, employees]);

    const weeklySummaryData = useMemo(() => {
        const defaultResult = { grossWages: 0, totalAdvances: 0, totalLateHoursDeduction: 0, netPay: 0 };

        if (isLoadingSummaryData || !weekAttendances || !employees || !allAdvances) {
            return defaultResult;
        }

        try {
            const grossWages = weekAttendances.reduce((sum: number, attendance: Attendance) => {
                if (attendance.status === 'presente') {
                    const { wage } = getWageForDate(attendance.employeeId, attendance.date);
                    return sum + wage;
                }
                return sum;
            }, 0);

            const totalLateHoursDeduction = weekAttendances.reduce((sum: number, attendance: Attendance) => {
                if (attendance.status === 'presente' && parseNumber(attendance.lateHours) > 0) {
                    const { hourlyRate } = getWageForDate(attendance.employeeId, attendance.date);
                    return sum + (parseNumber(attendance.lateHours) * hourlyRate);
                }
                return sum;
            }, 0);

            // Calculate total deductions from advances (installments)
            const totalAdvances = allAdvances?.reduce((sum: number, advance: CashAdvance) => {
                // We need to check if this advance has an active installment for THIS week.
                // We can use the difference in weeks between Advance Date and Current Week Date.
                if (!currentWeek) return sum;

                const advanceDate = parseISO(advance.date);
                const weekEndDate = parseISO(currentWeek.endDate);

                // If advance was made AFTER this week, ignore it.
                if (advanceDate > weekEndDate) return sum;

                const installments = advance.installments || 1;
                const installmentAmount = advance.amount / installments;

                // Calculate weeks passed since advance.
                // We assume 1 installment per week starting from the week of the advance.
                const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
                // specific logic: Find the week of the advance?
                // Simplification: valid if (WeekEndDate >= AdvanceDate) AND (WeekEndDate < AdvanceDate + Installments * Weeks)

                const diffTime = Math.abs(weekEndDate.getTime() - advanceDate.getTime());
                const diffWeeks = Math.ceil(diffTime / millisecondsPerWeek);

                // Current week is the "nth" week after advance. 
                // If advance date is roughly same as week start, it's week 1.
                // Let's rely on week IDs or more robust date comparison if possible.
                // For now: Check if current week is within [AdvanceDate, AdvanceDate + N weeks]

                // Let's try matching weeks by ID first? No, advance has creation week ID.
                // Using start dates.
                const advanceWeekStart = advanceDate; // param check needed
                // Heuristic: If week.endDate is >= advance.date, it COULD be a valid deduction week.
                // We need to count how many valid payroll weeks have passed? No, just chronological weeks.

                // Logic:
                // 1. Advance Date (Start of tracking).
                // 2. Installments count.
                // 3. Current Week End Date.

                // If (CurrentWeekEnd >= AdvanceDate)
                //   WeeksPassed = floor((CurrentWeekEnd - AdvanceDate) / 7days)
                //   If WeeksPassed < Installments:
                //      Include InstallmentAmount.

                // Refined:
                // Advance Date: 2024-06-01. Installments: 2.
                // Week 1 (Ends 2024-06-07). Diff = 6 days. WeeksPassed = 0? (It's the first week).
                // We want to deduct in the first week too.

                const _diffDays = (weekEndDate.getTime() - advanceDate.getTime()) / (1000 * 3600 * 24);

                // If negative, advance is in future (relative to this week).
                if (_diffDays < 0) return sum;

                const installmentIndex = Math.floor(_diffDays / 7); // 0-based index. 0 = 1st installment.

                if (installmentIndex < installments) {
                    return sum + installmentAmount;
                }

                return sum;
            }, 0) || 0;

            const netPay = grossWages - totalAdvances - totalLateHoursDeduction;

            if (isNaN(grossWages) || isNaN(totalAdvances) || isNaN(totalLateHoursDeduction) || isNaN(netPay)) {
                console.error("NaN detected in weekly summary calculation", { grossWages, totalAdvances, totalLateHoursDeduction });
                return defaultResult;
            }

            return { grossWages, totalAdvances, totalLateHoursDeduction, netPay };
        } catch (error) {
            console.error("Error calculating weekly summary:", error);
            return defaultResult;
        }

    }, [weekAttendances, employees, allAdvances, currentWeek, isLoadingSummaryData, getWageForDate]);

    const formatDateRange = (startDate: string, endDate: string) => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
    };

    if (isLoadingCurrentWeek) {
        return <Skeleton className="h-80 w-full" />;
    }

    if (!currentWeek) {
        return (
            <Card>
                <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                    <p className="text-lg font-medium text-muted-foreground">No hay una semana seleccionada.</p>
                    <p className="text-sm text-muted-foreground">Utilice el selector de semana para comenzar.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Planilla de Pagos: {formatDateRange(currentWeek.startDate, currentWeek.endDate)}</CardTitle>
                <CardDescription>
                    Resumen de pagos a empleados para la semana seleccionada.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingSummaryData ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm font-medium text-muted-foreground">Sueldos Brutos (Asistencias)</p>
                            <p className="text-2xl font-bold">{formatCurrency(weeklySummaryData.grossWages)}</p>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Total Deducciones</p>
                            <p className="text-2xl font-bold text-destructive">
                                {formatCurrency((weeklySummaryData.totalAdvances + weeklySummaryData.totalLateHoursDeduction) * -1)}
                            </p>
                            <div className="text-xs text-muted-foreground pt-1">
                                <div className="flex justify-between"><span>Adelantos:</span><span>{formatCurrency(weeklySummaryData.totalAdvances * -1)}</span></div>
                                <div className="flex justify-between"><span>Horas Tarde:</span><span>{formatCurrency(weeklySummaryData.totalLateHoursDeduction * -1)}</span></div>
                            </div>
                        </div>
                        <div className="rounded-lg border bg-muted p-4">
                            <p className="text-sm font-medium text-muted-foreground">Neto a Pagar</p>
                            <p className="text-2xl font-bold">{formatCurrency(weeklySummaryData.netPay)}</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="justify-end">
                <div className="flex gap-2 flex-wrap justify-end">
                    <Button asChild variant="outline" disabled={!currentWeek?.id}>
                        <Link href={`/imprimir-recibos?weekId=${currentWeek.id}&type=contractors`} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Recibos (Contratistas)
                        </Link>
                    </Button>
                    <Button asChild variant="outline" disabled={!currentWeek?.id}>
                        <Link href={`/imprimir-recibos?weekId=${currentWeek.id}&type=fund-requests`} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Recibos (Solicitudes)
                        </Link>
                    </Button>
                    <Button asChild disabled={!currentWeek?.id}>
                        <Link href={`/imprimir-recibos?weekId=${currentWeek.id}&type=employees`} target="_blank">
                            <Download className="mr-2 h-4 w-4" />
                            Recibos (Empleados)
                        </Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
