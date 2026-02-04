'use client';

import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, Project, ContractorCertification, FundRequest } from '@/lib/types';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

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

const payrollWeekConverter = { toFirestore: (data: PayrollWeek): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => ({ ...snapshot.data(options), id: snapshot.id } as PayrollWeek) };
const employeeConverter = { toFirestore: (data: Employee): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id, dailyWage: parseNumber(snapshot.data(options)!.dailyWage) } as Employee) };
const attendanceConverter = { toFirestore: (data: Attendance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance) };
const cashAdvanceConverter = { toFirestore: (data: CashAdvance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => ({ ...snapshot.data(options), id: snapshot.id, amount: parseNumber(snapshot.data(options)!.amount) } as CashAdvance) };
const projectConverter = { toFirestore: (data: Project): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project) };
const certificationConverter = { toFirestore: (data: ContractorCertification): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => ({ ...snapshot.data(options), id: snapshot.id, amount: parseNumber(snapshot.data(options)!.amount) } as ContractorCertification) };
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
            amount: parseNumber(data.amount),
            currency: data.currency,
            exchangeRate: parseNumber(data.exchangeRate || 1),
            status: data.status,
            description: data.description,
        };
    }
};

const formatCurrency = (amount: number, currency: string = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

interface EmployeeReceiptData {
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

export function PayrollReceipts({ weekId, type }: { weekId: string, type: 'employees' | 'contractors' | 'fund-requests' | null }) {
  const firestore = useFirestore();

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

  const certificationsQuery = useMemo(() => firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
  const { data: certifications, isLoading: isLoadingCerts } = useCollection<ContractorCertification>(certificationsQuery);

  const fundRequestsQuery = useMemo(() => firestore ? query(
    collection(firestore, 'fundRequests').withConverter(fundRequestConverter),
    where('status', 'in', ['Aprobado', 'Pagado'])
    ) : null, [firestore]);
  const { data: allFundRequests, isLoading: isLoadingFundRequests } = useCollection<FundRequest>(fundRequestsQuery);

  const isLoading = isLoadingWeek || isLoadingEmployees || isLoadingAttendances || isLoadingAdvances || isLoadingProjects || isLoadingCerts || isLoadingFundRequests;

  const weeklyFundRequests = useMemo(() => {
    if (!allFundRequests || !week) return [];
    return allFundRequests.filter(req => {
        const reqDate = parseISO(req.date);
        return reqDate >= parseISO(week.startDate) && reqDate <= parseISO(week.endDate);
    });
  }, [allFundRequests, week]);

  const projectsMap = useMemo(() => {
    if (!projects) return new Map<string, string>();
    return new Map(projects.map(p => [p.id, p.name]));
  }, [projects]);

  const employeeReceiptsData = useMemo<EmployeeReceiptData[]>(() => {
    if (!week || !employees || !attendances || !advances) return [];

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
    }).filter(data => data.summary.grossPay > 0 || data.summary.totalAdvances > 0);
  }, [week, employees, attendances, advances]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Cargando datos de la planilla...</span></div>;
  }
  
  if (!week) {
    return <div className="flex h-screen items-center justify-center"><p>No se encontró la semana de pago.</p></div>;
  }

  if (type === 'fund-requests') {
    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-2xl font-bold">Recibos de Solicitudes de Fondos</h1>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Todo</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 print:grid-cols-2 print:gap-x-4 print:gap-y-2">
              {weeklyFundRequests?.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-md border border-dashed col-span-full">No hay solicitudes aprobadas para esta semana.</div>
              ) : weeklyFundRequests?.map(req => (
                <div key={req.id} className="p-4 bg-white rounded-lg shadow-md break-inside-avoid print:p-2 print:shadow-none print:border print:text-[10px]">
                    <header className="flex justify-between items-start border-b pb-2 print:pb-1">
                        <div>
                            <Logo className="h-5 w-auto" />
                            <p className="text-xs text-gray-500 mt-1 print:text-[8px] print:mt-0.5">PMD Arquitectura</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-sm font-semibold print:text-[10px]">Recibo de Solicitud de Fondos</h2>
                            <p className="text-xs text-gray-500 print:text-[8px]">
                            Semana del {format(parseISO(week.startDate), 'dd/MM/yy')} al {format(parseISO(week.endDate), 'dd/MM/yy')}
                            </p>
                        </div>
                    </header>

                    <section className="mt-2 print:mt-1 text-xs print:text-[9px]">
                      <h3 className="font-medium">Solicitante: {req.requesterName}</h3>
                      <p className="text-gray-500">Fecha Solicitud: {format(parseISO(req.date), 'dd/MM/yyyy')}</p>
                    </section>

                    <section className="mt-2 print:mt-1 border-t pt-2 print:pt-1">
                        <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground print:text-[8px] print:mb-0.5">Detalle</h4>
                        <div className="text-xs print:text-[9px] space-y-0.5">
                            <p><span className="font-semibold">Categoría:</span> {req.category}</p>
                            {req.projectName && <p><span className="font-semibold">Obra:</span> {req.projectName}</p>}
                            {req.description && <p className="italic">"{req.description}"</p>}
                        </div>
                    </section>
                    
                    <section className="mt-2 print:mt-1 border-t-2 border-dashed pt-1">
                      <div className="flex justify-between items-center text-sm font-bold print:text-[10px]">
                        <span>MONTO A RENDIR:</span>
                        <span>{formatCurrency(req.amount, req.currency)}</span>
                      </div>
                    </section>
                    
                    <footer className="mt-4 print:mt-2 flex justify-between items-end">
                        <div className="w-1/2 pt-4">
                            <div className="border-t pt-1 text-center text-xs print:text-[8px]">
                            Firma del Solicitante
                            </div>
                        </div>
                        <div className="w-1/2 text-right text-xs text-gray-400 print:text-[8px]">
                            Recibo generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}
                        </div>
                    </footer>
                </div>
              ))}
            </div>
        </div>
    )
  }
  
  if (type === 'contractors') {
    const contractorReceipts = certifications?.filter(c => c.status === 'Aprobado' || c.status === 'Pagado');
    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-2xl font-bold">Recibos de Pago (Contratistas)</h1>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Todo</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 print:grid-cols-2 print:gap-x-4 print:gap-y-2">
              {contractorReceipts?.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-md border border-dashed col-span-full">No hay certificaciones aprobadas para esta semana.</div>
              ) : contractorReceipts?.map(cert => (
                <div key={cert.id} className="p-4 bg-white rounded-lg shadow-md break-inside-avoid print:p-2 print:shadow-none print:border print:text-[10px]">
                    <header className="flex justify-between items-start border-b pb-2 print:pb-1">
                        <div>
                            <Logo className="h-5 w-auto" />
                            <p className="text-xs text-gray-500 mt-1 print:text-[8px] print:mt-0.5">PMD Arquitectura</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-sm font-semibold print:text-[10px]">Recibo Semanal de Contratista</h2>
                            <p className="text-xs text-gray-500 print:text-[8px]">
                            Semana del {format(parseISO(week.startDate), 'dd/MM/yy')} al {format(parseISO(week.endDate), 'dd/MM/yy')}
                            </p>
                        </div>
                    </header>

                    <section className="mt-2 print:mt-1 text-xs print:text-[9px]">
                      <h3 className="font-medium">Contratista: {cert.contractorName}</h3>
                      <p className="text-gray-500">Obra: {cert.projectName}</p>
                    </section>

                    <section className="mt-2 print:mt-1 border-t pt-2 print:pt-1">
                        <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground print:text-[8px] print:mb-0.5">Detalle</h4>
                        <p className="text-xs print:text-[9px]">{cert.notes || 'Certificación de trabajos semanales.'}</p>
                    </section>
                    
                    <section className="mt-2 print:mt-1 border-t-2 border-dashed pt-1">
                      <div className="flex justify-between items-center text-sm font-bold print:text-[10px]">
                        <span>TOTAL A PAGAR:</span>
                        <span>{formatCurrency(cert.amount, cert.currency)}</span>
                      </div>
                    </section>
                    
                    <footer className="mt-4 print:mt-2 flex justify-between items-end">
                        <div className="w-1/2 pt-4">
                            <div className="border-t pt-1 text-center text-xs print:text-[8px]">
                            Firma del Contratista
                            </div>
                        </div>
                        <div className="w-1/2 text-right text-xs text-gray-400 print:text-[8px]">
                            Recibo generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}
                        </div>
                    </footer>
                </div>
              ))}
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

      <div className="grid grid-cols-1 gap-4 print:grid-cols-2 print:gap-x-4 print:gap-y-2">
        {employeeReceiptsData.length === 0 && <div className="flex h-64 items-center justify-center rounded-md border border-dashed col-span-full">No hay actividad registrada para empleados esta semana.</div>}
        {employeeReceiptsData.map(data => {
            const projectAttendanceSummary = Object.entries(
                data.attendance.reduce((acc, attendance) => {
                  if (attendance.status === 'presente' && attendance.projectId) {
                    const projectName = projectsMap.get(attendance.projectId) || 'Obra no asignada';
                    const wage = data.employee.dailyWage || 0;
                    if (!acc[projectName]) {
                      acc[projectName] = { days: 0, earnings: 0 };
                    }
                    acc[projectName].days += 1;
                    acc[projectName].earnings += wage;
                  }
                  return acc;
                }, {} as Record<string, { days: number; earnings: number }>)
            );
            
            return (
          <div key={data.employee.id} className="p-4 bg-white rounded-lg shadow-md break-inside-avoid print:p-2 print:shadow-none print:border print:text-[10px]">
            <header className="flex justify-between items-start border-b pb-2 print:pb-1">
              <div>
                <Logo className="h-5 w-auto" />
                <p className="text-xs text-gray-500 mt-1 print:text-[8px] print:mt-0.5">PMD Arquitectura</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-semibold print:text-[10px]">Recibo Semanal</h2>
                <p className="text-xs text-gray-500 print:text-[8px]">
                  Semana del {format(parseISO(data.week.startDate), 'dd/MM/yy')} al {format(parseISO(data.week.endDate), 'dd/MM/yy')}
                </p>
              </div>
            </header>

            <section className="mt-2 print:mt-1 text-xs print:text-[9px]">
              <h3 className="font-medium">Empleado: {data.employee.name}</h3>
              <p className="text-gray-500">Categoría: {data.employee.category}</p>
            </section>

            <section className="mt-2 print:mt-1 grid grid-cols-2 gap-x-2">
              <div>
                <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground print:text-[8px] print:mb-0.5">Haberes</h4>
                <div className="space-y-0.5 text-xs print:text-[9px]">
                  {projectAttendanceSummary.length > 0 ? (
                    projectAttendanceSummary.map(([projectName, details]) => (
                      <div key={projectName} className="flex justify-between">
                        <span>{projectName} ({details.days}d):</span>
                        <span>{formatCurrency(details.earnings)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>Días Trab.:</span>
                      <span>{data.summary.daysPresent}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-0.5 mt-0.5">
                    <span>Total Bruto:</span>
                    <span>{formatCurrency(data.summary.grossPay)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-xs mb-1 uppercase text-muted-foreground print:text-[8px] print:mb-0.5">Deducciones</h4>
                 <div className="space-y-0.5 text-xs print:text-[9px]">
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
            
            <section className="mt-2 print:mt-1 border-t-2 border-dashed pt-1">
              <div className="flex justify-between items-center text-sm font-bold print:text-[10px]">
                <span>NETO A COBRAR:</span>
                <span>{formatCurrency(data.summary.netPay)}</span>
              </div>
            </section>
            
            <footer className="mt-4 print:mt-2 flex justify-between items-end">
              <div className="w-1/2 pt-4">
                <div className="border-t pt-1 text-center text-xs print:text-[8px]">
                  Firma del Empleado
                </div>
              </div>
              <div className="w-1/2 text-right text-xs text-gray-400 print:text-[8px]">
                <p>Recibo generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </footer>
          </div>
        )})}
      </div>
    </div>
  );
}
