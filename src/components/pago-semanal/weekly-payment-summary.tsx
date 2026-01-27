
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, and } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, FundRequest, ContractorCertification, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Handshake, HardHat } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return 'ARS 0,00';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

// Converters
const employeeConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee) };
const attendanceConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance) };
const cashAdvanceConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => ({ ...snapshot.data(options), id: snapshot.id } as CashAdvance) };
const fundRequestConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => ({ ...snapshot.data(options), id: snapshot.id } as FundRequest) };
const certificationConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => ({ ...snapshot.data(options), id: snapshot.id } as ContractorCertification) };
const projectConverter = { fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project) };

export function WeeklyPaymentSummary({ currentWeek, isLoadingWeek }: { currentWeek?: PayrollWeek, isLoadingWeek: boolean }) {
    const firestore = useFirestore();

    const { weekStart, weekEnd } = useMemo(() => {
        if (!currentWeek) return { weekStart: null, weekEnd: null };
        return {
            weekStart: format(parseISO(currentWeek.startDate), 'yyyy-MM-dd'),
            weekEnd: format(parseISO(currentWeek.endDate), 'yyyy-MM-dd'),
        };
    }, [currentWeek]);

    // Data Fetching
    const { data: attendances, isLoading: l1 } = useCollection(currentWeek ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null);
    const { data: advances, isLoading: l2 } = useCollection(currentWeek ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null);
    const { data: fundRequests, isLoading: l3 } = useCollection(weekStart && weekEnd ? query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), and(where('status', '==', 'Aprobado'), where('date', '>=', weekStart), where('date', '<=', weekEnd))) : null);
    const { data: certifications, isLoading: l4 } = useCollection(currentWeek ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('payrollWeekId', '==', currentWeek.id), where('status', '==', 'Aprobado')) : null);
    const { data: employees, isLoading: l5 } = useCollection(firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null);
    const { data: projects, isLoading: l6 } = useCollection(firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null);
    
    const isLoadingData = isLoadingWeek || l1 || l2 || l3 || l4 || l5 || l6;

    const { totalPersonal, totalContratistas, totalSolicitudes, grandTotal, breakdown } = useMemo(() => {
        if (!attendances || !advances || !fundRequests || !certifications || !employees || !projects) {
            return { totalPersonal: 0, totalContratistas: 0, totalSolicitudes: 0, grandTotal: 0, breakdown: [] };
        }

        const employeeMap = new Map(employees.map(e => [e.id, { wage: e.dailyWage, hourlyRate: e.dailyWage / 8 }]));
        const projectMap = new Map<string, { name: string, personal: number, contratistas: number, solicitudes: number }>();
        projects.forEach(p => projectMap.set(p.id, { name: p.name, personal: 0, contratistas: 0, solicitudes: 0 }));
        
        // Calculate Personal Cost
        const personalCostByProject = new Map<string, number>();
        attendances.forEach(att => {
            if (att.status === 'presente' && att.projectId) {
                const emp = employeeMap.get(att.employeeId);
                if (emp) {
                    const dailyCost = emp.wage - ((att.lateHours || 0) * emp.hourlyRate);
                    personalCostByProject.set(att.projectId, (personalCostByProject.get(att.projectId) || 0) + dailyCost);
                }
            }
        });
        advances.forEach(adv => {
            if (adv.projectId) {
                personalCostByProject.set(adv.projectId, (personalCostByProject.get(adv.projectId) || 0) - adv.amount);
            }
        });
        
        let totalPersonal = 0;
        personalCostByProject.forEach((cost, projectId) => {
            const projectEntry = projectMap.get(projectId);
            if (projectEntry) projectEntry.personal += cost;
            totalPersonal += cost;
        });

        // Calculate Contractor Cost
        let totalContratistas = 0;
        certifications.forEach(cert => {
            totalContratistas += cert.amount;
            const projectEntry = projectMap.get(cert.projectId);
            if (projectEntry) projectEntry.contratistas += cert.amount;
        });

        // Calculate Fund Request Cost
        let totalSolicitudes = 0;
        fundRequests.forEach(req => {
            const amountInArs = req.currency === 'USD' ? req.amount * req.exchangeRate : req.amount;
            totalSolicitudes += amountInArs;
            if (req.projectId) {
                const projectEntry = projectMap.get(req.projectId);
                if (projectEntry) projectEntry.solicitudes += amountInArs;
            }
        });

        const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
        const breakdown = Array.from(projectMap.values()).filter(p => p.personal || p.contratistas || p.solicitudes);

        return { totalPersonal, totalContratistas, totalSolicitudes, grandTotal, breakdown };

    }, [attendances, advances, fundRequests, certifications, employees, projects]);

    if (isLoadingWeek) {
        return <Skeleton className="h-96 w-full" />
    }
    
    if (!currentWeek) {
         return (
            <Card>
                <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                    <p className="text-lg font-medium text-muted-foreground">No hay ninguna semana de pagos activa.</p>
                    <p className="text-sm text-muted-foreground">Genere una nueva semana para ver el resumen de pagos.</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoadingData) {
        return <Skeleton className="h-96 w-full" />
    }
    
    const summaryCards = [
        { title: 'Total Personal', value: totalPersonal, icon: HardHat },
        { title: 'Total Contratistas', value: totalContratistas, icon: Handshake },
        { title: 'Total Solicitudes', value: totalSolicitudes, icon: Briefcase },
    ];

    return (
        <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle>Total a Pagar esta Semana</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(grandTotal)}</p>
                </CardContent>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-3">
                {summaryCards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(card.value)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Desglose por Obra</CardTitle>
                    <CardDescription>Costos totales por proyecto para la semana activa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Obra</TableHead>
                                    <TableHead className="text-right">Personal</TableHead>
                                    <TableHead className="text-right">Contratistas</TableHead>
                                    <TableHead className="text-right">Solicitudes</TableHead>
                                    <TableHead className="text-right font-bold">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {breakdown.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay costos imputados a obras esta semana.</TableCell></TableRow>
                                )}
                                {breakdown.map(item => {
                                    const subtotal = item.personal + item.contratistas + item.solicitudes;
                                    return (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.personal)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.contratistas)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.solicitudes)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{formatCurrency(subtotal)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
