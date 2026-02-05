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
import { employeeConverter, attendanceConverter, cashAdvanceConverter, parseNumber } from "@/lib/converters";


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
    if (isLoadingSummaryData || !weekAttendances || !employees || !weekAdvances) {
        return defaultResult;
    }
    
    try {
        const employeeWageMap = new Map(employees.map((e: Employee) => [e.id, parseNumber(e.dailyWage)]));
        const employeeHourlyRateMap = new Map(employees.map((e: Employee) => [e.id, parseNumber(e.dailyWage) / 8]));

        const grossWages = weekAttendances.reduce((sum, attendance) => {
            if (attendance.status === 'presente') {
                const wage = employeeWageMap.get(attendance.employeeId) || 0;
                return sum + wage;
            }
            return sum;
        }, 0);

        const totalLateHoursDeduction = weekAttendances.reduce((sum, attendance) => {
          if (attendance.status === 'presente' && parseNumber(attendance.lateHours) > 0) {
              const hourlyRate = employeeHourlyRateMap.get(attendance.employeeId) || 0;
              return sum + (parseNumber(attendance.lateHours) * hourlyRate);
          }
          return sum;
        }, 0);

        const totalAdvances = weekAdvances.reduce((sum, advance) => sum + parseNumber(advance.amount), 0);
        
        const netPay = grossWages - totalAdvances - totalLateHoursDeduction;
        
       if (isNaN(grossWages) || isNaN(totalAdvances) || isNaN(totalLateHoursDeduction) || isNaN(netPay)) {
            console.error("NaN detected in weekly summary calculation", { grossWages, totalAdvances, totalLateHoursDeduction });
            return defaultResult;
       }

        return { grossWages, totalAdvances, totalLateHoursDeduction, netPay };
    } catch(error) {
        console.error("Error calculating weekly summary:", error);
        return defaultResult;
    }

  }, [weekAttendances, employees, weekAdvances, isLoadingSummaryData]);

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
