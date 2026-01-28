'use client';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser, useCollection } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const employeeConverter = {
    toFirestore(employee: Employee): DocumentData {
        const { id, ...data } = employee;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Employee {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name || '',
            email: data.email || undefined,
            phone: data.phone || undefined,
            status: data.status || 'Inactivo',
            paymentType: data.paymentType || 'Semanal',
            category: data.category || 'N/A',
            dailyWage: data.dailyWage || 0,
            artExpiryDate: data.artExpiryDate || undefined,
            documents: data.documents || [],
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
        };
    }
};

const attendanceConverter = {
    toFirestore(attendance: Attendance): DocumentData {
        const { id, ...data } = attendance;
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            employeeId: data.employeeId,
            date: data.date,
            status: data.status,
            lateHours: data.lateHours || 0,
            notes: data.notes || '',
            projectId: data.projectId || null,
            payrollWeekId: data.payrollWeekId,
        };
    }
};

const cashAdvanceConverter = {
    toFirestore(advance: CashAdvance): DocumentData {
        const { id, ...data } = advance;
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            projectId: data.projectId || undefined,
            projectName: data.projectName || undefined,
            date: data.date,
            amount: data.amount || 0,
            reason: data.reason || undefined,
            payrollWeekId: data.payrollWeekId,
        };
    }
};

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
  };


export function HistoricalWeekViewDialog({ week, children }: { week: PayrollWeek, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { firestore } = useUser();

    // Data for the summary
    const attendanceQuery = useMemo(
        () => firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', week.id)) : null,
        [firestore, week.id]
    );
    const { data: weekAttendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendanceQuery);

    const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter)) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const advancesQuery = useMemo(
        () => firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', week.id)) : null,
        [firestore, week.id]
    );
    const { data: weekAdvances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);
    
    const isLoadingSummaryData = isLoadingAttendances || isLoadingEmployees || isLoadingAdvances;
    
    const weeklySummaryData = useMemo(() => {
        if (!weekAttendances || !employees || !weekAdvances) {
            return { grossWages: 0, totalAdvances: 0, totalLateHoursDeduction: 0, netPay: 0 };
        }

        const employeeWageMap = new Map(employees.map(e => [e.id, e.dailyWage]));
        const employeeHourlyRateMap = new Map(employees.map(e => [e.id, (e.dailyWage || 0) / 8])); // Assuming 8-hour day

        const grossWages = weekAttendances.reduce((sum, attendance) => {
            if (attendance.status === 'presente') {
                const wage = employeeWageMap.get(attendance.employeeId) || 0;
                return sum + wage;
            }
            return sum;
        }, 0);

        const totalLateHoursDeduction = weekAttendances.reduce((sum, attendance) => {
          if (attendance.status === 'presente' && attendance.lateHours > 0) {
              const hourlyRate = employeeHourlyRateMap.get(attendance.employeeId) || 0;
              return sum + (attendance.lateHours * hourlyRate);
          }
          return sum;
        }, 0);

        const totalAdvances = weekAdvances.reduce((sum, advance) => sum + advance.amount, 0);

        const netPay = grossWages - totalAdvances - totalLateHoursDeduction;

        return { grossWages, totalAdvances, totalLateHoursDeduction, netPay };

    }, [weekAttendances, employees, weekAdvances]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detalle de Semana Cerrada</DialogTitle>
                    <DialogDescription>
                        Resumen de la planilla de pagos del {formatDateRange(week.startDate, week.endDate)}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                {isLoadingSummaryData ? (
                            <div className="grid gap-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : (
                            <div className="grid gap-4">
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
                                        <div className="flex justify-between">
                                            <span>Adelantos:</span>
                                            <span>{formatCurrency(weeklySummaryData.totalAdvances * -1)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Horas Tarde:</span>
                                            <span>{formatCurrency(weeklySummaryData.totalLateHoursDeduction * -1)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border bg-muted p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Neto Pagado</p>
                                    <p className="text-2xl font-bold">{formatCurrency(weeklySummaryData.netPay)}</p>
                                </div>
                            </div>
                        )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
