'use client';

import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, Project } from '@/lib/types';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

// Converters
const payrollWeekConverter = { 
    toFirestore: (data: PayrollWeek): DocumentData => data, 
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => ({ ...snapshot.data(options), id: snapshot.id } as PayrollWeek) 
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
            dailyWage: data.dailyWage || 0,
            artExpiryDate: data.artExpiryDate || undefined,
            accidentInsuranceUrl: data.accidentInsuranceUrl || undefined,
            criminalRecordUrl: data.criminalRecordUrl || undefined,
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

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};


const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

interface ReceiptData {
  employee: Employee;
  week: PayrollWeek;
  attendance: Attendance[];
  advances: CashAdvance[];
  summary: {
    daysPresent: number;
    daysAbsent: number;
    totalLateHours: number;
    grossPay: number;
    totalAdvances: number;
    lateHoursDeduction: number;
    netPay: number;
  };
}

export function PayrollReceipts({ weekId, type }: { weekId: string, type: 'employees' | 'contractors' }) {
  const firestore = useFirestore();

  // Data fetching
  const weekDocRef = useMemo(() => firestore ? doc(firestore, 'payrollWeeks', weekId).withConverter(payrollWeekConverter) : null, [firestore, weekId]);
  const { data: week, isLoading: isLoadingWeek } = useDoc<PayrollWeek>(weekDocRef);

  const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter), where('status', '==', 'Activo')) : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const attendanceQuery = useMemo(() => firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
  const { data: attendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendanceQuery);
  
  const advancesQuery = useMemo(() => firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);

  const projectsQuery = useMemo(() => firestore ? query(collection(firestore, 'projects').withConverter(projectConverter)) : null, [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const isLoading = isLoadingWeek || isLoadingEmployees || isLoadingAttendances || isLoadingAdvances || isLoadingProjects;

  const projectsMap = useMemo(() => {
    if (!projects) return new Map<string, string>();
    return new Map(projects.map(p => [p.id, p.name]));
  }, [projects]);

  const receiptsData = useMemo<ReceiptData[]>(() => {
    if (isLoading || !week || !employees || !attendances || !advances) return [];

    return employees.map(employee => {
      const employeeAttendances = attendances.filter(a => a.employeeId === employee.id);
      const employeeAdvances = advances.filter(a => a.employeeId === employee.id);

      const daysPresent = employeeAttendances.filter(a => a.status === 'presente').length;
      const daysAbsent = employeeAttendances.filter(a => a.status === 'ausente').length;
      const totalLateHours = employeeAttendances.reduce((sum, a) => sum + (a.lateHours || 0), 0);
      
      const hourlyRate = (employee.dailyWage || 0) / 8; // Assuming 8-hour day
      const lateHoursDeduction = totalLateHours * hourlyRate;
      
      const grossPay = daysPresent * (employee.dailyWage || 0);
      const totalAdvances = employeeAdvances.reduce((sum, ad) => sum + ad.amount, 0);
      const netPay = grossPay - totalAdvances - lateHoursDeduction;

      return {
        employee,
        week,
        attendance: employeeAttendances,
        advances: employeeAdvances,
        summary: {
          daysPresent,
          daysAbsent,
          totalLateHours,
          grossPay,
          totalAdvances,
          lateHoursDeduction,
          netPay,
        }
      };
    });
  }, [isLoading, week, employees, attendances, advances]);

  const weekDays = useMemo(() => {
    if (!week) return [];
    const start = parseISO(week.startDate);
    const end = parseISO(week.endDate);
    return eachDayOfInterval({ start, end });
  }, [week]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Cargando datos de la planilla...</span></div>;
  }
  
  if (!week) {
    return <div className="flex h-screen items-center justify-center"><p>No se encontró la semana de pago.</p></div>;
  }

  if (type === 'contractors') {
    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-2xl font-bold">Recibos de Pago (Contratistas)</h1>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Todo</Button>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-md break-inside-avoid print:p-2 print:shadow-none print:border">
                <header className="flex justify-between items-start border-b pb-2">
                    <div>
                        <Logo className="h-6 w-auto" />
                        <p className="text-xs text-gray-500 mt-1">PMD Arquitectura</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-base font-semibold">Recibo de Pago a Contratista</h2>
                        <p className="text-xs text-gray-500">
                        Semana del {format(parseISO(week.startDate), 'dd/MM/yy')} al {format(parseISO(week.endDate), 'dd/MM/yy')}
                        </p>
                    </div>
                </header>

                <div className="flex h-24 items-center justify-center rounded-md border border-dashed my-4">
                    <p className="text-muted-foreground text-center text-xs">La liquidación semanal para contratistas está en construcción.<br/>Este recibo es un modelo de ejemplo.</p>
                </div>
                
                <footer className="mt-4 flex justify-between items-end">
                    <div className="w-1/2">
                        <div className="border-t pt-1 text-center text-xs">
                        Firma del Contratista
                        </div>
                    </div>
                    <div className="w-1/2 text-right text-xs text-gray-400">
                        Recibo generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </div>
                </footer>
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-2xl font-bold">Recibos de Pago (Empleados)</h1>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Todo</Button>
      </div>

      <div className="space-y-4 print:space-y-2">
        {receiptsData.map(data => (
          <div key={data.employee.id} className="p-4 bg-white rounded-lg shadow-md break-inside-avoid print:p-2 print:shadow-none print:border">
            <header className="flex justify-between items-start border-b pb-2">
              <div>
                <Logo className="h-6 w-auto" />
                <p className="text-xs text-gray-500 mt-1">PMD Arquitectura</p>
              </div>
              <div className="text-right">
                <h2 className="text-base font-semibold">Recibo de Sueldo</h2>
                <p className="text-xs text-gray-500">
                  Semana del {format(parseISO(data.week.startDate), 'dd/MM/yy')} al {format(parseISO(data.week.endDate), 'dd/MM/yy')}
                </p>
              </div>
            </header>

            <section className="mt-2 text-xs">
              <h3 className="font-medium">Empleado: {data.employee.name}</h3>
              <p className="text-gray-500">Categoría: {data.employee.category}</p>
            </section>
            
            <section className="mt-1">
              <h4 className="font-medium text-[8px] mb-0.5 uppercase text-gray-500">Detalle de Asistencias</h4>
              <div className="border rounded-sm overflow-hidden">
                <table className="w-full text-[8px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {weekDays.map(day => (
                        <th key={day.toString()} className="p-0.5 font-medium text-center">{format(day, 'E dd', { locale: es })}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      {weekDays.map(day => {
                        const attendanceRecord = data.attendance.find(a => format(parseISO(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                        return (
                          <td key={day.toString()} className="p-0.5 text-center leading-tight">
                            <div className="font-semibold capitalize text-[9px]">{attendanceRecord ? attendanceRecord.status.charAt(0).toUpperCase() : '-'}</div>
                            {attendanceRecord?.status === 'presente' && (
                                <div className="text-[7px] text-gray-500 font-mono">
                                    {attendanceRecord.projectId && projectsMap.get(attendanceRecord.projectId)
                                        ? projectsMap.get(attendanceRecord.projectId)!.substring(0, 4).toUpperCase()
                                        : '-'}
                                </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground">Liquidación</h4>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between"><span>Días Trab.:</span><span>{data.summary.daysPresent}</span></div>
                  <div className="flex justify-between"><span>Jornal:</span><span>{formatCurrency(data.employee.dailyWage)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-0.5 mt-0.5"><span>Bruto:</span><span>{formatCurrency(data.summary.grossPay)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground">Deducciones</h4>
                 <div className="space-y-0.5 text-xs">
                    {data.advances.length > 0 && data.advances.map(adv => (
                       <div key={adv.id} className="flex justify-between">
                         <span>Adelanto ({format(parseISO(adv.date), 'dd/MM')}):</span>
                         <span>({formatCurrency(adv.amount)})</span>
                       </div>
                    ))}
                    {data.summary.lateHoursDeduction > 0 && (
                        <div className="flex justify-between">
                            <span>Hs. Tarde ({data.summary.totalLateHours} hs):</span>
                            <span>({formatCurrency(data.summary.lateHoursDeduction)})</span>
                        </div>
                    )}
                    {(data.advances.length === 0 && data.summary.lateHoursDeduction === 0) && (
                        <p className="text-gray-400">Sin deducciones</p>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-0.5 mt-0.5">
                        <span>Total Deducido:</span>
                        <span>({formatCurrency(data.summary.totalAdvances + data.summary.lateHoursDeduction)})</span>
                    </div>
                 </div>
              </div>
            </section>
            
            <section className="mt-2 border-t-2 border-dashed pt-1">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>NETO A COBRAR:</span>
                <span>{formatCurrency(data.summary.netPay)}</span>
              </div>
            </section>
            
            <footer className="mt-4 flex justify-between items-end">
              <div className="w-1/2">
                <div className="border-t pt-1 text-center text-xs">
                  Firma del Empleado
                </div>
              </div>
              <div className="w-1/2 text-right text-xs text-gray-400">
                <p>Recibo generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </footer>
          </div>
        ))}
      </div>
    </div>
  );
}
