'use client';

import { useMemo, useCallback } from 'react';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, collectionGroup } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, Project, ContractorCertification, FundRequest, DailyWageHistory } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { payrollWeekConverter, employeeConverter, attendanceConverter, cashAdvanceConverter, projectConverter, certificationConverter, fundRequestConverter, dailyWageHistoryConverter } from '@/lib/converters';


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
  const { permissions } = useUser();

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

  const wageHistoriesQuery = useMemo(() => (firestore && permissions.canSupervise ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore, permissions.canSupervise]);
  const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);

  const isLoading = isLoadingWeek || isLoadingEmployees || isLoadingAttendances || isLoadingAdvances || isLoadingProjects || isLoadingCerts || isLoadingFundRequests || isLoadingWageHistories;

  const weeklyFundRequests = useMemo(() => {
    if (!allFundRequests || !week) return [];
    const weekStart = parseISO(week.startDate);
    const weekEnd = parseISO(week.endDate);
    weekEnd.setHours(23, 59, 59, 999); 
    
    return allFundRequests.filter((req: FundRequest) => {
        if (!req.date) return false;
        try {
            const reqDate = parseISO(req.date);
            return reqDate >= weekStart && reqDate <= weekEnd;
        } catch (e) {
            return false;
        }
    });
  }, [allFundRequests, week]);

  const projectsMap = useMemo(() => {
    if (!projects) return new Map<string, string>();
    return new Map(projects.map((p: Project) => [p.id, p.name]));
  }, [projects]);
  
  const getWageForDate = useCallback((employeeId: string, date: string): { wage: number, hourlyRate: number } => {
    if (!wageHistories || !employees) {
        const currentEmployee = employees?.find((e: Employee) => e.id === employeeId);
        const wage = currentEmployee?.dailyWage || 0;
        return { wage, hourlyRate: wage / 8 };
    };
    
    const histories = wageHistories
        .filter(h => h.employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    if (histories.length > 0) {
        const wage = histories[0].amount;
        return { wage, hourlyRate: wage / 8 };
    }
    
    const currentEmployee = employees.find((e) => e.id === employeeId);
    const wage = currentEmployee?.dailyWage || 0;
    return { wage, hourlyRate: wage / 8 };
}, [wageHistories, employees]);

  const employeeReceiptsData = useMemo<EmployeeReceiptData[]>(() => {
    if (!week || !employees || !attendances || !advances) return [];

    return employees.map((employee: Employee) => {
      const employeeAttendances = attendances.filter((a: Attendance) => a.employeeId === employee.id);
      const employeeAdvances = advances.filter((a: CashAdvance) => a.employeeId === employee.id);

      const daysPresent = employeeAttendances.filter((a: Attendance) => a.status === 'presente').length;
      const daysAbsent = employeeAttendances.filter((a: Attendance) => a.status === 'ausente').length;
      
      const grossPay = employeeAttendances.reduce((sum: number, att: Attendance) => {
        if (att.status === 'presente') {
            const { wage } = getWageForDate(employee.id, att.date);
            return sum + wage;
        }
        return sum;
      }, 0);

      const { totalLateHours, lateHoursDeduction } = employeeAttendances.reduce((acc: { totalLateHours: number, lateHoursDeduction: number }, att: Attendance) => {
          if (att.status === 'presente' && att.lateHours > 0) {
              const { hourlyRate } = getWageForDate(employee.id, att.date);
              acc.totalLateHours += att.lateHours;
              acc.lateHoursDeduction += att.lateHours * hourlyRate;
          }
          return acc;
      }, { totalLateHours: 0, lateHoursDeduction: 0 });
      
      const totalAdvances = employeeAdvances.reduce((sum: number, ad: CashAdvance) => sum + ad.amount, 0);
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
    }).filter((data: EmployeeReceiptData) => data.summary.grossPay > 0 || data.summary.totalAdvances > 0);
  }, [week, employees, attendances, advances, getWageForDate]);

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
              ) : weeklyFundRequests?.map((req: FundRequest) => (
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
    const contractorReceipts = certifications?.filter((c: ContractorCertification) => c.status === 'Aprobado' || c.status === 'Pagado');
    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-2xl font-bold">Recibos de Pago (Contratistas)</h1>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Todo</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 print:grid-cols-2 print:gap-x-4 print:gap-y-2">
              {contractorReceipts?.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-md border border-dashed col-span-full">No hay certificaciones aprobadas para esta semana.</div>
              ) : contractorReceipts?.map((cert: ContractorCertification) => (
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
        {employeeReceiptsData.map((data: EmployeeReceiptData) => {
            const projectAttendanceSummary = Object.entries(
                data.attendance.reduce((acc: Record<string, { days: number; earnings: number }>, attendance: Attendance) => {
                  if (attendance.status === 'presente' && attendance.projectId) {
                    const projectName = projectsMap.get(attendance.projectId) || 'Obra no asignada';
                    const { wage } = getWageForDate(data.employee.id, attendance.date);
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
                    projectAttendanceSummary.map(([projectName, details]: [string, { days: number; earnings: number }]) => (
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
                    {data.advances.length > 0 && data.advances.map((adv: CashAdvance) => (
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
