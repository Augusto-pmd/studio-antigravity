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
import { collection, query, orderBy, doc, getDocs, limit, setDoc, updateDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, writeBatch, where, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PayrollWeek, Employee, Attendance, CashAdvance, Expense } from "@/lib/types";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

const payrollWeekConverter = {
    toFirestore: (data: PayrollWeek): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => ({ ...snapshot.data(options), id: snapshot.id } as PayrollWeek)
};

const employeeConverter = {
    toFirestore: (data: Employee): DocumentData => {
        const { id, ...rest } = data;
        return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee)
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
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function WeeklySummary() {
  const { permissions, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isAdmin = permissions.canValidate;

  const payrollWeeksQuery = useMemo(
    () => firestore ? query(collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter), orderBy('startDate', 'desc')) : null,
    [firestore]
  );
  const { data: weeks, isLoading: isLoadingWeeks } = useCollection<PayrollWeek>(payrollWeeksQuery);

  const currentWeek = useMemo(() => weeks?.find(w => w.status === 'Abierta'), [weeks]);
  const historicalWeeks = useMemo(() => {
    if (!weeks) return [];
    return weeks.filter(w => w.status === 'Cerrada');
  }, [weeks]);

  // Data for the summary
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
      if (!weekAttendances || !employees || !weekAdvances) {
          return { grossWages: 0, totalAdvances: 0, netPay: 0 };
      }

      const employeeWageMap = new Map(employees.map(e => [e.id, e.dailyWage]));

      const grossWages = weekAttendances.reduce((sum, attendance) => {
          if (attendance.status === 'presente') {
              const wage = employeeWageMap.get(attendance.employeeId) || 0;
              return sum + wage;
          }
          return sum;
      }, 0);

      const totalAdvances = weekAdvances.reduce((sum, advance) => sum + advance.amount, 0);

      const netPay = grossWages - totalAdvances;

      return { grossWages, totalAdvances, netPay };

  }, [weekAttendances, employees, weekAdvances]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
  };

  const handleGenerateNewWeek = () => {
    if (!firestore) return;
    if (weeks?.some(w => w.status === 'Abierta')) {
      toast({
        variant: "destructive",
        title: "Semana Abierta",
        description: "Ya existe una semana abierta. Debe cerrarla antes de generar una nueva.",
      });
      return;
    }

    startTransition(() => {
      const generate = async () => {
        const lastWeekQuery = query(collection(firestore, 'payrollWeeks'), orderBy('startDate', 'desc'), limit(1));
        const lastWeekSnap = await getDocs(lastWeekQuery);
        
        let nextStartDate: Date;

        if (lastWeekSnap.empty) {
          nextStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        } else {
          const lastWeek = lastWeekSnap.docs[0].data() as PayrollWeek;
          nextStartDate = addDays(parseISO(lastWeek.startDate), 7);
        }

        const nextEndDate = endOfWeek(nextStartDate, { weekStartsOn: 1 });

        const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
        const newWeek: PayrollWeek = {
          id: newWeekRef.id,
          startDate: nextStartDate.toISOString(),
          endDate: nextEndDate.toISOString(),
          status: 'Abierta',
          generatedAt: new Date().toISOString(),
        };

        return setDoc(newWeekRef, newWeek)
          .then(() => {
            toast({
                title: "Nueva Semana Generada",
                description: `Se ha creado la semana del ${format(nextStartDate, 'dd/MM')} al ${format(nextEndDate, 'dd/MM')}.`,
            });
          });
      };

      generate().catch((error) => {
        console.error("Error writing to Firestore:", error);
        toast({ variant: 'destructive', title: "Error al generar", description: "No se pudo generar la nueva semana. Es posible que no tengas permisos." });
      });
    });
  };
  
  const handleCloseWeek = (weekId: string, weekStartDate: string, weekEndDate: string) => {
      if (!firestore) return;
      
      startTransition(async () => {
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
            const advancesQueryToFetch = query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', weekId));

            const [employeesSnap, attendanceSnap, advancesSnap] = await Promise.all([
                getDocs(employeesQueryToFetch),
                getDocs(attendanceQueryToFetch),
                getDocs(advancesQueryToFetch),
            ]);

            const employeesData = employeesSnap.docs.map(d => d.data());
            const attendancesData = attendanceSnap.docs.map(d => d.data());
            const advancesData = advancesSnap.docs.map(d => d.data());

            const employeeWages = new Map(employeesData.map(e => [e.id, e.dailyWage]));
            const costsByProject = new Map<string, { wages: number, advances: number }>();

            for (const attendance of attendancesData) {
                if (attendance.status === 'presente' && attendance.projectId) {
                    const wage = employeeWages.get(attendance.employeeId) || 0;
                    const projectCost = costsByProject.get(attendance.projectId) || { wages: 0, advances: 0 };
                    projectCost.wages += wage;
                    costsByProject.set(attendance.projectId, projectCost);
                }
            }

            for (const advance of advancesData) {
                if (advance.projectId) {
                    const projectCost = costsByProject.get(advance.projectId) || { wages: 0, advances: 0 };
                    projectCost.advances += advance.amount;
                    costsByProject.set(advance.projectId, projectCost);
                }
            }

            const weekEndDateISO = parseISO(weekEndDate).toISOString();
            const weekRange = formatDateRange(weekStartDate, weekEndDate);

            for (const [projectId, costs] of costsByProject.entries()) {
                const totalCost = costs.wages + costs.advances;
                if (totalCost > 0) {
                    const expenseRef = doc(collection(firestore, `projects/${projectId}/expenses`));
                    const newExpense: Omit<Expense, 'id'> = {
                        projectId: projectId,
                        date: weekEndDateISO,
                        supplierId: supplierId,
                        categoryId: 'CAT-02', 
                        documentType: 'Recibo Común',
                        description: `Costo de personal y adelantos - Semana ${weekRange}`,
                        amount: totalCost,
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
            {isAdmin && (
                <Button onClick={handleGenerateNewWeek} disabled={isPending || isLoadingWeeks}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generar Nueva Semana
                </Button>
            )}
         </div>
        
        <TabsContent value="actual">
            {isLoadingWeeks && <Skeleton className="h-80 w-full" />}
            {!isLoadingWeeks && !currentWeek && (
                 <Card>
                    <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                        <p className="text-lg font-medium text-muted-foreground">No hay ninguna semana de pagos activa.</p>
                        {isAdmin && <p className="text-sm text-muted-foreground">Utilice el botón "Generar Nueva Semana" para comenzar.</p>}
                    </CardContent>
                 </Card>
            )}
            {!isLoadingWeeks && currentWeek && (
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
                                <div className="rounded-lg border p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Adelantos Otorgados</p>
                                    <p className="text-2xl font-bold text-destructive">{formatCurrency(weeklySummaryData.totalAdvances * -1)}</p>
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
                             {isAdmin && currentWeek.status === 'Abierta' && (
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
                    Consulte las planillas de semanas anteriores. Las semanas cerradas solo pueden ser modificadas por un administrador.
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
                                {isLoadingWeeks && <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>}
                                {!isLoadingWeeks && historicalWeeks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No hay semanas en el historial.</TableCell>
                                    </TableRow>
                                )}
                                {historicalWeeks.map(week => (
                                    <TableRow key={week.id}>
                                        <TableCell className="font-medium">{formatDateRange(week.startDate, week.endDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{week.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">
                                                {isAdmin ? <FilePenLine className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                                {isAdmin ? "Editar" : "Ver"}
                                            </Button>
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
