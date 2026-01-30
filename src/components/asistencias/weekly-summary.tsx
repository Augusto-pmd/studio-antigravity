'use client';

import { useState, useTransition, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PlusCircle, FilePenLine, Eye, Loader2 } from "lucide-react";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, query, orderBy, doc, getDocs, limit, setDoc, updateDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, writeBatch, where, getDoc, collectionGroup } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PayrollWeek, Employee, Attendance, CashAdvance, Expense } from "@/lib/types";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { HistoricalWeekViewDialog } from "./historical-week-view-dialog";
import { GenerateWeekDialog } from "./generate-week-dialog";

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
            amount: data.amount,
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

export function WeeklySummary({ currentWeek, historicalWeeks, isLoadingCurrentWeek, isLoadingHistoricalWeeks }: { currentWeek?: PayrollWeek, historicalWeeks: PayrollWeek[], isLoadingCurrentWeek: boolean, isLoadingHistoricalWeeks: boolean }) {
  const { firestore, permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
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
        const employeeWageMap = new Map(employees.map((e: Employee) => [e.id, Number(e.dailyWage) || 0]));
        const employeeHourlyRateMap = new Map(employees.map((e: Employee) => [e.id, (Number(e.dailyWage) || 0) / 8]));

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
                return sum + ((Number(attendance.lateHours) || 0) * hourlyRate);
            }
            return sum;
        }, 0);

        const totalAdvances = weekAdvances.reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);

        const netPay = grossWages - totalAdvances - totalLateHoursDeduction;

        if (isNaN(netPay)) {
            console.error("WeeklySummary calculation resulted in NaN.", { grossWages, totalAdvances, totalLateHoursDeduction });
            return defaultResult;
        }

        return { grossWages, totalAdvances, totalLateHoursDeduction, netPay };
    } catch(error) {
        console.error("Error calculating weekly summary:", error);
        return defaultResult;
    }

  }, [isLoadingSummaryData, weekAttendances, employees, weekAdvances]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
  };
  
  const handleCloseWeek = (weekId: string, weekStartDate: string, weekEndDate: string) => {
      if (!firestore) return;
      
      startTransition(() => {
        (async () => {
            toast({ title: "Cerrando semana...", description: "Calculando costos y generando gastos. Esto puede tardar un momento." });

            try {
                const batch = writeBatch(firestore);

                const supplierId = 'personal-propio';
                const supplierRef = doc(firestore, 'suppliers', supplierId);
                const supplierSnap = await getDoc(supplierRef);

                if (!supplierSnap.exists()) {
                    batch.set(supplierRef, {
                        id: supplierId,
                        name: 'Personal Propio',
                        cuit: '00-00000000-0',
                        status: 'Aprobado',
                        type: 'Servicios'
                    });
                }
                
                const employeesQueryToFetch = query(collection(firestore, 'employees').withConverter(employeeConverter));
                const attendanceQueryToFetch = query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', weekId));
                
                const [employeesSnap, attendanceSnap] = await Promise.all([
                    getDocs(employeesQueryToFetch),
                    getDocs(attendanceQueryToFetch),
                ]);

                const employeesData = employeesSnap.docs.map((d: any) => d.data());
                const attendancesData = attendanceSnap.docs.map((d: any) => d.data());
                
                const employeeWages = new Map(employeesData.map((e: any) => [e.id, e.dailyWage]));
                const costsByProject = new Map<string, number>();

                for (const attendance of attendancesData) {
                    if (attendance.status === 'presente' && attendance.projectId) {
                        const wage = employeeWages.get(attendance.employeeId) || 0;
                        costsByProject.set(attendance.projectId, (costsByProject.get(attendance.projectId) || 0) + wage);
                    }
                }

                const weekEndDateISO = parseISO(weekEndDate).toISOString();
                const weekRange = formatDateRange(weekStartDate, weekEndDate);

                for (const [projectId, cost] of costsByProject.entries()) {
                    if (cost > 0) {
                        const expenseRef = doc(collection(firestore, `projects/${projectId}/expenses`));
                        const newExpense: Omit<Expense, 'id'> = {
                            projectId: projectId,
                            date: weekEndDateISO,
                            supplierId: supplierId,
                            categoryId: 'CAT-02', 
                            documentType: 'Recibo Común',
                            description: `Costo de mano de obra - Semana ${weekRange}`,
                            amount: cost,
                            currency: 'ARS',
                            exchangeRate: 1,
                            status: 'Pagado',
                            paymentMethod: 'Planilla Semanal',
                            paidDate: new Date().toISOString(),
                        };
                        batch.set(expenseRef, newExpense);
                    }
                }

                const weekRef = doc(firestore, 'payrollWeeks', weekId);
                batch.update(weekRef, { status: 'Cerrada' });

                await batch.commit();

                toast({
                    title: "Semana Cerrada Exitosamente",
                    description: "Se han imputado los costos de personal a cada obra correspondiente."
                });
            } catch (error) {
                console.error("Error closing week:", error);
                toast({ variant: 'destructive', title: "Error al cerrar", description: "No se pudo cerrar la semana y generar los gastos. Es posible que no tengas permisos." });
            }
        })();
      });
  };
  
  const handleReopenWeek = (week: PayrollWeek) => {
    if (!firestore || !permissions.canSupervise) return;
    if (currentWeek) {
        toast({
            variant: "destructive",
            title: "Operación no permitida",
            description: `Ya hay una semana abierta (${formatDateRange(currentWeek.startDate, currentWeek.endDate)}). Debe cerrarla primero.`,
        });
        return;
    }

    startTransition(() => {
        (async () => {
            toast({ title: "Reabriendo semana...", description: "Eliminando los gastos contables generados previamente. Esto puede tardar." });

            try {
                const batch = writeBatch(firestore);

                const weekRange = formatDateRange(week.startDate, week.endDate);
                const expenseDescription = `Costo de mano de obra - Semana ${weekRange}`;
                const expensesQuery = query(
                    collectionGroup(firestore, 'expenses'),
                    where('description', '==', expenseDescription),
                    where('supplierId', '==', 'personal-propio')
                );
                const expensesSnap = await getDocs(expensesQuery);
                expensesSnap.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                const weekRef = doc(firestore, 'payrollWeeks', week.id);
                batch.update(weekRef, { status: 'Abierta' });

                await batch.commit();
                toast({
                    title: "Semana Reabierta",
                    description: `La semana del ${weekRange} está activa nuevamente. Los gastos contables asociados fueron revertidos.`,
                });

            } catch (error) {
                console.error("Error reopening week:", error);
                toast({ variant: 'destructive', title: "Error al reabrir", description: "No se pudo reabrir la semana. Es posible que no tengas permisos." });
            }
        })();
    });
};

  return (
    <div className="mt-4">
       <Tabs defaultValue="actual" className="w-full">
         <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="actual">Semana Actual</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            {permissions.canSupervise && (
                <GenerateWeekDialog disabled={isPending || isLoadingCurrentWeek || !!currentWeek} />
            )}
         </div>
        
        <TabsContent value="actual">
            {isLoadingCurrentWeek && <Skeleton className="h-80 w-full" />}
            {!isLoadingCurrentWeek && !currentWeek && (
                 <Card>
                    <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                        <p className="text-lg font-medium text-muted-foreground">No hay ninguna semana de pagos activa.</p>
                        <p className="text-sm text-muted-foreground">Utilice el botón "Generar Nueva Semana" para comenzar.</p>
                    </CardContent>
                 </Card>
            )}
            {!isLoadingCurrentWeek && currentWeek && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Planilla de Pagos: {formatDateRange(currentWeek.startDate, currentWeek.endDate)}</CardTitle>
                        <CardDescription>
                        Resumen de pagos a empleados para la semana en curso. Los montos se actualizan en tiempo real.
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
                                    <p className="text-sm font-medium text-muted-foreground">Neto a Pagar</p>
                                    <p className="text-2xl font-bold">{formatCurrency(weeklySummaryData.netPay)}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="justify-between">
                        <p className="text-sm text-muted-foreground">Estado de la semana: 
                            <span className={cn(
                                "font-semibold ml-1",
                                currentWeek.status === 'Abierta' ? 'text-green-500' : 'text-red-500'
                            )}>
                                {currentWeek.status}
                            </span>
                        </p>
                        <div className="flex gap-2 flex-wrap justify-end">
                             {currentWeek.status === 'Abierta' && permissions.canSupervise && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" disabled={isPending}>Cerrar y Contabilizar</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está seguro que desea cerrar la semana?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción es irreversible y generará los gastos de mano de obra en cada obra. Una vez cerrada, no se podrán registrar más asistencias
                                            ni adelantos para este período.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleCloseWeek(currentWeek.id, currentWeek.startDate, currentWeek.endDate)}>Confirmar Cierre</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button asChild variant="outline" disabled={!currentWeek}>
                                <Link href={`/imprimir-recibos?weekId=${currentWeek?.id}&type=contractors`} target="_blank">
                                    <Download className="mr-2 h-4 w-4" />
                                    Recibos (Contratistas)
                                </Link>
                            </Button>
                            <Button asChild disabled={!currentWeek}>
                                <Link href={`/imprimir-recibos?weekId=${currentWeek?.id}&type=employees`} target="_blank">
                                    <Download className="mr-2 h-4 w-4" />
                                    Recibos (Empleados)
                                </Link>
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </TabsContent>
        <TabsContent value="historial">
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Planillas Semanales</CardTitle>
                    <CardDescription>
                    Consulte las planillas de semanas anteriores.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Semana</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingHistoricalWeeks && <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>}
                                {!isLoadingHistoricalWeeks && historicalWeeks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No hay semanas en el historial.</TableCell>
                                    </TableRow>
                                )}
                                {!isLoadingHistoricalWeeks && historicalWeeks.map((week: PayrollWeek) => (
                                    <TableRow key={week.id}>
                                        <TableCell className="font-medium">{formatDateRange(week.startDate, week.endDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{week.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                           <div className="flex items-center justify-end gap-2">
                                                <HistoricalWeekViewDialog week={week}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver Detalle
                                                    </Button>
                                                </HistoricalWeekViewDialog>
                                                {permissions.canSupervise && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" disabled={isPending || !!currentWeek}>
                                                                <FilePenLine className="mr-2 h-4 w-4" />
                                                                Reabrir
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Está seguro que desea reabrir esta semana?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción revertirá los gastos de mano de obra que se generaron al cerrar la semana y la marcará como "Abierta".
                                                                    Solo puede haber una semana abierta a la vez.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleReopenWeek(week)}>Confirmar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                           </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
