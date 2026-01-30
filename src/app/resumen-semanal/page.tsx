'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, and, doc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, limit } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, FundRequest, ContractorCertification, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Handshake, HardHat } from 'lucide-react';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

// This function is the core of the fix. It ensures that any value we try to use
// in a calculation is a valid number, otherwise it safely defaults to 0.
const safeParseFloat = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

// --- Converters (unchanged) ---
const payrollWeekConverter = { toFirestore: (data: PayrollWeek): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => ({ ...snapshot.data(options), id: snapshot.id } as PayrollWeek) };
const employeeConverter = { toFirestore: (data: Employee): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee) };
const attendanceConverter = { toFirestore: (data: Attendance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance) };
const cashAdvanceConverter = { toFirestore: (data: CashAdvance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => ({ ...snapshot.data(options), id: snapshot.id } as CashAdvance) };
const fundRequestConverter = { toFirestore: (data: FundRequest): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => ({ ...snapshot.data(options), id: snapshot.id } as FundRequest) };
const certificationConverter = { toFirestore: (data: ContractorCertification): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => ({ ...snapshot.data(options), id: snapshot.id } as ContractorCertification) };
const projectConverter = { toFirestore: (data: Project): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project) };

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

export default function ResumenSemanalPage() {
    const firestore = useFirestore();
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    // --- Data Fetching Hooks (REBUILT WITH useMemo) ---
    const openWeekQuery = useMemo(() => firestore ? query(collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter), where('status', '==', 'Abierta'), limit(1)) : null, [firestore]);
    const { data: openWeeks, isLoading: isLoadingWeek } = useCollection<PayrollWeek>(openWeekQuery);
    const currentWeek = useMemo(() => openWeeks?.[0], [openWeeks]);

    const attendancesQuery = useMemo(() => currentWeek && firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null, [currentWeek, firestore]);
    const { data: attendances, isLoading: l1 } = useCollection(attendancesQuery);

    const advancesQuery = useMemo(() => currentWeek && firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null, [currentWeek, firestore]);
    const { data: advances, isLoading: l2 } = useCollection(advancesQuery);
    
    const fundRequestsQuery = useMemo(() => {
        if (!currentWeek || !firestore || !currentWeek.startDate || !currentWeek.endDate || !isValid(parseISO(currentWeek.startDate)) || !isValid(parseISO(currentWeek.endDate))) return null;
        
        // NORMALIZE DATES to start/end of day to ensure all requests within the week are included regardless of time.
        const weekStart = startOfDay(parseISO(currentWeek.startDate)).toISOString();
        const weekEnd = endOfDay(parseISO(currentWeek.endDate)).toISOString();

        return query(
            collection(firestore, 'fundRequests').withConverter(fundRequestConverter), 
            and(
                where('status', '==', 'Aprobado'), 
                where('date', '>=', weekStart), 
                where('date', '<=', weekEnd)
            )
        );
    }, [currentWeek, firestore]);
    const { data: fundRequests, isLoading: l3 } = useCollection(fundRequestsQuery);

    const certificationsQuery = useMemo(() => currentWeek && firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), and(where('payrollWeekId', '==', currentWeek.id), where('status', '==', 'Aprobado'))) : null, [currentWeek, firestore]);
    const { data: certifications, isLoading: l4 } = useCollection(certificationsQuery);

    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null, [firestore]);
    const { data: employees, isLoading: l5 } = useCollection(employeesQuery);

    const projectsQuery = useMemo(() => firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null, [firestore]);
    const { data: projects, isLoading: l6 } = useCollection(projectsQuery);
    
    const isLoadingData = isLoadingWeek || l1 || l2 || l3 || l4 || l5 || l6;

    // --- Calculation Logic (unchanged, but now fed by stable queries) ---
    useEffect(() => {
        if (isLoadingData) {
            setIsCalculating(true);
            return;
        }

        const defaultResult: SummaryData = { totalPersonal: 0, totalContratistas: 0, totalSolicitudes: 0, grandTotal: 0, breakdown: [] };

        try {
            if (!currentWeek || !employees || !projects) {
                setSummary(defaultResult);
                setIsCalculating(false);
                return;
            }

            const employeeMap = new Map(employees.map(e => [e.id, { wage: safeParseFloat(e.dailyWage), hourlyRate: safeParseFloat(e.dailyWage) / 8 }]));
            const projectMap = new Map<string, { id: string, name: string, personal: number, contratistas: number, solicitudes: number }>();
            projects.forEach(p => {
                if (p.id && p.name) projectMap.set(p.id, { id: p.id, name: p.name, personal: 0, contratistas: 0, solicitudes: 0 });
            });

            // PERSONAL
            let totalPersonal = 0;
            if (attendances && advances) {
                const grossWages = attendances.reduce((sum, att) => {
                    const emp = employeeMap.get(att.employeeId);
                    return (att.status === 'presente' && emp) ? sum + emp.wage : sum;
                }, 0);

                const lateHoursDeductions = attendances.reduce((sum, att) => {
                    const emp = employeeMap.get(att.employeeId);
                    const lateHours = safeParseFloat(att.lateHours);
                    return (att.status === 'presente' && lateHours > 0 && emp) ? sum + (lateHours * emp.hourlyRate) : sum;
                }, 0);

                const totalAdvances = advances.reduce((sum, adv) => sum + safeParseFloat(adv.amount), 0);
                totalPersonal = grossWages - lateHoursDeductions - totalAdvances;
                
                 attendances.forEach(att => {
                    const emp = employeeMap.get(att.employeeId);
                    const proj = att.projectId ? projectMap.get(att.projectId) : undefined;
                    if (att.status === 'presente' && proj && emp) {
                        proj.personal += (emp.wage - (safeParseFloat(att.lateHours) * emp.hourlyRate));
                    }
                });
                advances.forEach(adv => {
                    const proj = adv.projectId ? projectMap.get(adv.projectId) : undefined;
                    if (proj) {
                        proj.personal -= safeParseFloat(adv.amount);
                    }
                });
            }
            
            // CONTRATISTAS
            let totalContratistas = 0;
            if (certifications) {
                totalContratistas = certifications.reduce((sum, cert) => sum + safeParseFloat(cert.amount), 0);
                 certifications.forEach(cert => {
                    const proj = cert.projectId ? projectMap.get(cert.projectId) : undefined;
                    if (proj) {
                        proj.contratistas += safeParseFloat(cert.amount);
                    }
                });
            }
            
            // SOLICITUDES
            let totalSolicitudes = 0;
            if (fundRequests) {
                totalSolicitudes = fundRequests.reduce((sum, req) => {
                    const amount = safeParseFloat(req.amount);
                    const exchangeRate = safeParseFloat(req.exchangeRate) || 1;
                    return sum + (req.currency === 'USD' ? amount * exchangeRate : amount);
                }, 0);
                 fundRequests.forEach(req => {
                    const proj = req.projectId ? projectMap.get(req.projectId) : undefined;
                    if (proj) {
                        const amount = safeParseFloat(req.amount);
                        const exchangeRate = safeParseFloat(req.exchangeRate) || 1;
                        proj.solicitudes += (req.currency === 'USD' ? amount * exchangeRate : amount);
                    }
                });
            }

            const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
            const breakdown = Array.from(projectMap.values()).filter(p => p.personal || p.contratistas || p.solicitudes);
            
            const finalSummary = {
                totalPersonal: isNaN(totalPersonal) ? 0 : totalPersonal,
                totalContratistas: isNaN(totalContratistas) ? 0 : totalContratistas,
                totalSolicitudes: isNaN(totalSolicitudes) ? 0 : totalSolicitudes,
                grandTotal: isNaN(grandTotal) ? 0 : grandTotal,
                breakdown: breakdown.map(p => ({
                    ...p,
                    personal: isNaN(p.personal) ? 0 : p.personal,
                    contratistas: isNaN(p.contratistas) ? 0 : p.contratistas,
                    solicitudes: isNaN(p.solicitudes) ? 0 : p.solicitudes,
                })),
            };

            setSummary(finalSummary);

        } catch (error) {
            console.error("FATAL: Calculation logic in ResumenSemanalPage failed.", error);
            setSummary(defaultResult);
        } finally {
            setIsCalculating(false);
        }
    }, [isLoadingData, currentWeek, attendances, advances, fundRequests, certifications, employees, projects]);

    if (isCalculating || isLoadingWeek) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!currentWeek) {
         return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-headline">Resumen Semanal de Pagos</h1>
                    <p className="mt-1 text-muted-foreground">
                        Vista consolidada de todos los pagos proyectados para la semana activa.
                    </p>
                </div>
                <Card>
                    <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
                        <p className="text-lg font-medium text-muted-foreground">No hay ninguna semana de pagos activa.</p>
                        <p className="text-sm text-muted-foreground">Genere una nueva semana en el módulo de "Pago Semanal" para ver el resumen.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const summaryCards = [
        { title: 'Total Personal', value: summary?.totalPersonal ?? 0, icon: HardHat },
        { title: 'Total Contratistas', value: summary?.totalContratistas ?? 0, icon: Handshake },
        { title: 'Total Solicitudes', value: summary?.totalSolicitudes ?? 0, icon: Briefcase },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-headline">Resumen Semanal de Pagos</h1>
                <p className="mt-1 text-muted-foreground">
                    Vista consolidada de todos los pagos proyectados para la semana activa.
                </p>
            </div>
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
        </div>
    );
}
