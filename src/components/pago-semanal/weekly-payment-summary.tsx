'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, and, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, FundRequest, ContractorCertification, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Handshake, HardHat } from 'lucide-react';
import { format, parseISO, addDays, isValid } from 'date-fns';

const safeParseFloat = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const employeeConverter = {
    toFirestore: (data: Employee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee)
};
const attendanceConverter = {
    toFirestore: (data: Attendance): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance)
};
const cashAdvanceConverter = {
    toFirestore: (data: CashAdvance): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => ({ ...snapshot.data(options), id: snapshot.id } as CashAdvance)
};
const fundRequestConverter = {
    toFirestore: (data: FundRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => ({ ...snapshot.data(options), id: snapshot.id } as FundRequest)
};
const certificationConverter = {
    toFirestore: (data: ContractorCertification): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => ({ ...snapshot.data(options), id: snapshot.id } as ContractorCertification)
};
const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
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

export function WeeklyPaymentSummary({ currentWeek, isLoadingWeek }: { currentWeek?: PayrollWeek, isLoadingWeek: boolean }) {
    const firestore = useFirestore();
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    const { data: attendances, isLoading: l1 } = useCollection(currentWeek && firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null);
    const { data: advances, isLoading: l2 } = useCollection(currentWeek && firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null);
    const fundRequestsQuery = useMemo(() => {
        if (!currentWeek || !firestore || !currentWeek.startDate || !currentWeek.endDate || !isValid(parseISO(currentWeek.startDate)) || !isValid(parseISO(currentWeek.endDate))) return null;
        return query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), 
            and(
                where('status', '==', 'Aprobado'), 
                where('date', '>=', currentWeek.startDate), 
                where('date', '<=', currentWeek.endDate)
            )
        );
    }, [currentWeek, firestore]);
    const { data: fundRequests, isLoading: l3 } = useCollection(fundRequestsQuery);
    const { data: certifications, isLoading: l4 } = useCollection(currentWeek && firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), and(where('payrollWeekId', '==', currentWeek.id), where('status', '==', 'Aprobado'))) : null);
    const { data: employees, isLoading: l5 } = useCollection(firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null);
    const { data: projects, isLoading: l6 } = useCollection(firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null);
    
    const isLoadingData = isLoadingWeek || l1 || l2 || l3 || l4 || l5 || l6;

    useEffect(() => {
        if (isLoadingData) {
            setIsCalculating(true);
            return;
        }

        const defaultResult: SummaryData = { totalPersonal: 0, totalContratistas: 0, totalSolicitudes: 0, grandTotal: 0, breakdown: [] };

        if (!currentWeek || !attendances || !advances || !fundRequests || !certifications || !employees || !projects) {
            setSummary(defaultResult);
            setIsCalculating(false);
            return;
        }
        
        setIsCalculating(true);
        try {
            const employeeMap = new Map(employees.map(e => [e.id, { 
                wage: safeParseFloat(e.dailyWage), 
                hourlyRate: safeParseFloat(e.dailyWage) / 8 
            }]));
            
            const grossWages = attendances.reduce((sum, att) => {
                if (att.status === 'presente' && att.employeeId && employeeMap.has(att.employeeId)) {
                    return sum + (employeeMap.get(att.employeeId)?.wage ?? 0);
                }
                return sum;
            }, 0);

            const lateHoursDeductions = attendances.reduce((sum, att) => {
                if (att.status === 'presente' && safeParseFloat(att.lateHours) > 0 && att.employeeId && employeeMap.has(att.employeeId)) {
                    return sum + (safeParseFloat(att.lateHours) * (employeeMap.get(att.employeeId)?.hourlyRate ?? 0));
                }
                return sum;
            }, 0);

            const totalAdvances = advances.reduce((sum, adv) => sum + safeParseFloat(adv.amount), 0);
            const totalPersonal = grossWages - lateHoursDeductions - totalAdvances;

            const totalContratistas = certifications.reduce((sum, cert) => sum + safeParseFloat(cert.amount), 0);

            const totalSolicitudes = fundRequests.reduce((sum, req) => {
                const amount = safeParseFloat(req.amount);
                const exchangeRate = safeParseFloat(req.exchangeRate) || 1;
                return sum + (req.currency === 'USD' ? amount * exchangeRate : amount);
            }, 0);

            const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
            
            const projectMap = new Map<string, { id: string, name: string, personal: number, contratistas: number, solicitudes: number }>();
            projects.forEach(p => {
                if (p.id && p.name) projectMap.set(p.id, { id: p.id, name: p.name, personal: 0, contratistas: 0, solicitudes: 0 });
            });
            
            attendances.forEach(att => {
                if (att.status === 'presente' && att.projectId && att.employeeId && projectMap.has(att.projectId) && employeeMap.has(att.employeeId)) {
                    const projectEntry = projectMap.get(att.projectId)!;
                    const emp = employeeMap.get(att.employeeId)!;
                    projectEntry.personal += (emp.wage - (safeParseFloat(att.lateHours) * emp.hourlyRate));
                }
            });

            advances.forEach(adv => {
                 if (adv.projectId && projectMap.has(adv.projectId)) {
                    projectMap.get(adv.projectId)!.personal -= safeParseFloat(adv.amount);
                 }
            });

            certifications.forEach(cert => {
                if (cert.projectId && projectMap.has(cert.projectId)) {
                    projectMap.get(cert.projectId)!.contratistas += safeParseFloat(cert.amount);
                }
            });

            fundRequests.forEach(req => {
                if (req.projectId && projectMap.has(req.projectId)) {
                    const amount = safeParseFloat(req.amount);
                    const exchangeRate = safeParseFloat(req.exchangeRate) || 1;
                    projectMap.get(req.projectId)!.solicitudes += (req.currency === 'USD' ? amount * exchangeRate : amount);
                }
            });

            const breakdown = Array.from(projectMap.values()).filter(p => p.personal || p.contratistas || p.solicitudes);

            setSummary({ totalPersonal, totalContratistas, totalSolicitudes, grandTotal, breakdown });
        } catch (error) {
            console.error("FATAL: Calculation in WeeklyPaymentSummary failed.", error);
            setSummary(defaultResult);
        } finally {
            setIsCalculating(false);
        }

    }, [isLoadingData, currentWeek, attendances, advances, fundRequests, certifications, employees, projects]);
    
    if (isCalculating || isLoadingWeek) {
        return <Skeleton className="h-96 w-full" />;
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
    
    const summaryCards = [
        { title: 'Total Personal', value: summary?.totalPersonal ?? 0, icon: HardHat },
        { title: 'Total Contratistas', value: summary?.totalContratistas ?? 0, icon: Handshake },
        { title: 'Total Solicitudes', value: summary?.totalSolicitudes ?? 0, icon: Briefcase },
    ];

    return (
        <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle>Total a Pagar esta Semana</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{formatCurrency(summary?.grandTotal ?? 0)}</p>
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
                                {summary?.breakdown.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay costos imputados a obras esta semana.</TableCell></TableRow>
                                ) : (
                                    summary?.breakdown.map((item) => {
                                        const subtotal = item.personal + item.contratistas + item.solicitudes;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(item.personal)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(item.contratistas)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(item.solicitudes)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">{formatCurrency(subtotal)}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
