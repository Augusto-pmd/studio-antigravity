'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, and, getDocs, limit, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc } from 'firebase/firestore';
import type { Employee, Attendance, FundRequest, ContractorCertification, Project, PayrollWeek } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Logo } from '@/components/icons/logo';
import { fundRequestConverter, employeeConverter, attendanceConverter, certificationConverter, projectConverter, payrollWeekConverter } from '@/lib/converters';


const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};


type SummaryData = {
    totalPersonal: number;
    totalContratistas: number;
    totalSolicitudes: number;
    grandTotal: number;
    breakdown: {
        id: string,
        name: string,
        personal: number,
        contratistas: number,
        solicitudes: number,
    }[];
};

export function WeeklySummaryPrint({ weekId }: { weekId: string }) {
    const firestore = useFirestore();

    // --- Data Fetching Hooks ---
    const weekDocRef = useMemo(() => firestore ? doc(firestore, 'payrollWeeks', weekId).withConverter(payrollWeekConverter) : null, [firestore, weekId]);
    const { data: week, isLoading: isLoadingWeek } = useDoc<PayrollWeek>(weekDocRef);
    
    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null, [firestore]);
    const { data: employees, isLoading: l5 } = useCollection(employeesQuery);

    const projectsQuery = useMemo(() => firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null, [firestore]);
    const { data: projects, isLoading: l6 } = useCollection(projectsQuery);
    
    const attendancesQuery = useMemo(() => firestore && weekId ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
    const { data: attendances, isLoading: l1 } = useCollection(attendancesQuery);
    
    const fundRequestsQuery = useMemo(() => firestore ? query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), where('status', 'in', ['Pendiente', 'Aprobado', 'Pagado'])) : null, [firestore]);
    const { data: allFundRequests, isLoading: l3 } = useCollection(fundRequestsQuery);

    const certificationsQuery = useMemo(() => firestore && weekId ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('payrollWeekId', '==', weekId), where('status', 'in', ['Pendiente', 'Aprobado', 'Pagado'])) : null, [firestore, weekId]);
    const { data: certifications, isLoading: l4 } = useCollection(certificationsQuery);

    const fundRequests = useMemo(() => {
        if (!allFundRequests || !week) return [];
        const start = parseISO(week.startDate);
        const end = parseISO(week.endDate);
        end.setHours(23, 59, 59, 999); 
        return allFundRequests.filter((req: FundRequest) => {
            if (!req.date) return false;
            try {
                const reqDate = parseISO(req.date);
                return reqDate >= start && reqDate <= end;
            } catch { return false; }
        });
    }, [allFundRequests, week]);

    const isLoading = isLoadingWeek || l1 || l3 || l4 || l5 || l6;

    // --- Calculation Logic ---
    const summary = useMemo((): SummaryData | null => {
        if (isLoading || !employees || !projects) return null;

        const employeeMap = new Map(employees.map((e: Employee) => [e.id, e.dailyWage]));
        const projectMap = new Map<string, { id: string, name: string, personal: number, contratistas: number, solicitudes: number }>();
        projects.forEach((p: Project) => { if (p.id && p.name) projectMap.set(p.id, { id: p.id, name: p.name, personal: 0, contratistas: 0, solicitudes: 0 }); });

        const totalPersonal = (attendances || []).reduce((sum, att) => {
            if (att.status === 'presente') {
                const dailyGross = employeeMap.get(att.employeeId) || 0;
                if (att.projectId) {
                    const projectData = projectMap.get(att.projectId);
                    if (projectData) {
                        projectData.personal += dailyGross;
                    }
                }
                return sum + dailyGross;
            }
            return sum;
        }, 0);
        
        const totalContratistas = (certifications || []).reduce((sum, cert) => {
            const amount = cert.amount;
            if (cert.projectId) {
                const projectData = projectMap.get(cert.projectId);
                if (projectData) {
                    projectData.contratistas += amount;
                }
            }
            return sum + amount;
        }, 0);
        
        const totalSolicitudes = (fundRequests || []).reduce((sum, req) => {
            const amount = req.currency === 'USD' ? req.amount * req.exchangeRate : req.amount;
            if (req.projectId) {
                const projectData = projectMap.get(req.projectId);
                if (projectData) {
                    projectData.solicitudes += amount;
                }
            }
            return sum + amount;
        }, 0);
        
        const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
        const breakdown = Array.from(projectMap.values()).filter(p => p.personal || p.contratistas || p.solicitudes);

        return { totalPersonal, totalContratistas, totalSolicitudes, grandTotal, breakdown };
    }, [isLoading, attendances, fundRequests, certifications, employees, projects]);


    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Generando resumen...</span></div>;
    }

    if (!summary || !week) {
        return <div className="flex h-screen items-center justify-center">Error al calcular el resumen. No se encontró la semana de pago o no hay datos.</div>;
    }

    return (
        <div className="p-4 sm:p-8 bg-white">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <Logo className="h-8 w-auto" />
                    <h1 className="text-2xl font-bold mt-2">Resumen Semanal de Pagos</h1>
                    <p className="text-muted-foreground">Semana del {format(parseISO(week.startDate), 'dd/MM/yyyy')} al {format(parseISO(week.endDate), 'dd/MM/yyyy')}</p>
                </div>
                <Button onClick={() => window.print()} className="no-print"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
            </header>

            <section className="space-y-6">
                 <div className="border p-4 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-500">Costo Total Estimado de la Semana</p>
                    <p className="text-4xl font-bold">{formatCurrency(summary.grandTotal)}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Total Personal</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalPersonal)}</p>
                    </div>
                    <div className="border p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Total Contratistas</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalContratistas)}</p>
                    </div>
                     <div className="border p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Total Solicitudes</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalSolicitudes)}</p>
                    </div>
                </div>

                <div className="border rounded-lg">
                    <h3 className="text-lg font-semibold p-4 border-b">Desglose por Obra</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-4 text-left font-medium text-gray-500">Obra</th>
                                <th className="p-4 text-right font-medium text-gray-500">Personal</th>
                                <th className="p-4 text-right font-medium text-gray-500">Contratistas</th>
                                <th className="p-4 text-right font-medium text-gray-500">Solicitudes</th>
                                <th className="p-4 text-right font-bold text-gray-700">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.breakdown.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay costos imputados a obras esta semana.</td></tr>
                            ) : (
                                summary.breakdown.map((item) => {
                                    const subtotal = item.personal + item.contratistas + item.solicitudes;
                                    return (
                                        <tr key={item.id} className="border-b">
                                            <td className="p-4 font-medium">{item.name}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(item.personal)}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(item.contratistas)}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(item.solicitudes)}</td>
                                            <td className="p-4 text-right font-mono font-bold">{formatCurrency(subtotal)}</td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
