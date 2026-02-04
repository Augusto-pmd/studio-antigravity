'use client';

import { useMemo } from "react";
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
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { PayrollWeek, Employee, Attendance, CashAdvance } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const parseNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
        const cleanedString = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedString);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

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
            dailyWage: parseNumber(data.dailyWage),
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
          lateHours: data.lateHours,
          notes: data.notes,
          projectId: data.projectId,
          payrollWeekId: data.payrollWeekId
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
            projectId: data.projectId,
            projectName: data.projectName,
            date: data.date,
            amount: parseNumber(data.amount),
            reason: data.reason,
            payrollWeekId: data.payrollWeekId,
        };
    }
};

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function WeeklySummary({ currentWeek, isLoadingCurrentWeek }: { currentWeek?: PayrollWeek | null, isLoadingCurrentWeek: boolean }) {
  const { firestore } = useUser();
  
  const attendanceQuery = useMemo(
      () => firestore && currentWeek ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null,
      [firestore, currentWeek]
  );
  const { data: weekAttendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendanceQuery);

  const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter), where('status', '==', 'Activo')) : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const advancesQuery = useMemo(
      () => firestore && currentWeek ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null,
      [firestore, currentWeek]
  );
  const { data: weekAdvances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);
  
  const isLoadingSummaryData = isLoadingAttendances || isLoadingEmployees || isLoadingAdvances;
  
  const weeklySummaryData = useMemo(() => {
    const defaultResult = { grossWages: 0, totalAdvances: 0, totalLateHoursDeduction: 0, netPay: 0 };
    if (!weekAttendances || !employees || !weekAdvances) return defaultResult;
    
    try {
        const employeeWageMap = new Map(employees.map((e: Employee) => [e.id, e.dailyWage]));
        const employeeHourlyRateMap = new Map(employees.map((e: Employee) => [e.id, e.dailyWage / 8]));

        const grossWages = weekAttendances.reduce((sum, attendance) => {
            if (attendance.status === 'presente') {
                const wage = employeeWageMap.get(attendance.employeeId) || 0;
                return sum + wage;
            }
            return sum;
        }, 0);

        const totalLateHoursDeduction = weekAttendances.reduce((sum, attendance) => {
            if (attendance.status === 'presente' && Number(attendance.lateHours) > 0) {
                const hourlyRate = employeeHourlyRateMap.get(attendance.employeeId) || 0;
                return sum + (parseNumber(attendance.lateHours.toString()) * hourlyRate);
            }
            return sum;
        }, 0);

        const totalAdvances = weekAdvances.reduce((sum, advance) => sum + advance.amount, 0);

        const netPay = grossWages - totalAdvances - totalLateHoursDeduction;

        if (isNaN(netPay)) return defaultResult;
        return { grossWages, totalAdvances, totalLateHoursDeduction, netPay };
    } catch(error) {
        console.error("Error calculating weekly summary:", error);
        return defaultResult;
    }

  }, [weekAttendances, employees, weekAdvances]);

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
                <Button asChild variant="outline" disabled={currentWeek.id.startsWith('virtual_')}>
                    <Link href={`/imprimir-recibos?weekId=${currentWeek.id}&type=contractors`} target="_blank">
                        <Download className="mr-2 h-4 w-4" />
                        Recibos (Contratistas)
                    </Link>
                </Button>
                <Button asChild variant="outline" disabled={currentWeek.id.startsWith('virtual_')}>
                    <Link href={`/imprimir-recibos?weekId=${currentWeek.id}&type=fund-requests`} target="_blank">
                        <Download className="mr-2 h-4 w-4" />
                        Recibos (Solicitudes)
                    </Link>
                </Button>
                <Button asChild disabled={currentWeek.id.startsWith('virtual_')}>
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
