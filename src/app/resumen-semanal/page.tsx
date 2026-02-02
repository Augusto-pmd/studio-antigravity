'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, and, doc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, limit } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, FundRequest, ContractorCertification, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Handshake, HardHat } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const parseNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    // If it's already a valid number, return it.
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    // If it's a string, try to parse it.
    if (typeof value === 'string') {
        // Remove thousand separators (dots) and then replace decimal comma with a dot.
        const cleanedString = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedString);
        return isNaN(num) ? 0 : num;
    }
    // For other types, or if parsing fails, return 0.
    return 0;
};

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return 'ARS 0,00';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

const convertDateToYYYYMMDD = (d: any): string => {
    if (!d) return '';
    try {
        let date: Date;
        // Handle Firestore Timestamp object
        if (d.toDate && typeof d.toDate === 'function') {
            date = d.toDate();
        } 
        // Handle ISO string or other string formats that date-fns can parse
        else {
            date = parseISO(d.toString());
        }

        // Check if the date is valid.
        if (isNaN(date.getTime())) {
             console.warn("Could not parse date:", d);
             return '';
        }

        // Use local date components, as the user's context is local and dates
        // stored in Firestore as Timestamps will be correctly converted to the
        // user's timezone by the browser's Date object.
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;

    } catch (error) {
        console.error("Error converting date:", d, error);
        return '';
    }
}

const payrollWeekConverter = {
    toFirestore: (data: PayrollWeek): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => {
        const data = snapshot.data(options)!;
        return {
            ...data,
            id: snapshot.id,
            startDate: convertDateToYYYYMMDD(data.startDate),
            endDate: convertDateToYYYYMMDD(data.endDate),
            generatedAt: convertDateToYYYYMMDD(data.generatedAt)
        } as PayrollWeek;
    }
};

const fundRequestConverter = {
    toFirestore: (data: FundRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => {
        const data = snapshot.data(options)!;
        return {
            ...data,
            id: snapshot.id,
            date: convertDateToYYYYMMDD(data.date),
        } as FundRequest;
    }
};


const employeeConverter = {
    toFirestore: (data: Employee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name || '',
            email: data.email || undefined,
            phone: data.phone || undefined,
            status: data.status || 'Inactivo',
            paymentType: data.paymentType || 'Semanal',
            category: data.category || 'N/A',
            dailyWage: parseNumber(data.dailyWage),
            artExpiryDate: data.artExpiryDate || undefined,
            documents: data.documents || [],
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
        } as Employee
    }
};
const attendanceConverter = { toFirestore: (data: Attendance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance) };
const cashAdvanceConverter = { toFirestore: (data: CashAdvance): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => ({ ...snapshot.data(options), id: snapshot.id } as CashAdvance) };
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

    // --- Data Fetching Hooks ---
    const openWeekQuery = useMemo(() => firestore ? query(collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter), where('status', '==', 'Abierta'), limit(1)) : null, [firestore]);
    const { data: openWeeks, isLoading: isLoadingWeek } = useCollection<PayrollWeek>(openWeekQuery);
    const currentWeek = useMemo(() => openWeeks?.[0], [openWeeks]);

    const attendancesQuery = useMemo(() => currentWeek && firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id)) : null, [currentWeek, firestore]);
    const { data: attendances, isLoading: l1 } = useCollection(attendancesQuery);
    
    // Fetch all approved requests, then filter by date on the client to avoid composite index issues.
    const allApprovedFundRequestsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'fundRequests').withConverter(fundRequestConverter), 
            where('status', '==', 'Aprobado')
        );
    }, [firestore]);
    const { data: allApprovedFundRequests, isLoading: l3 } = useCollection(allApprovedFundRequestsQuery);

    const fundRequests = useMemo(() => {
        if (!allApprovedFundRequests || !currentWeek || !currentWeek.startDate || !currentWeek.endDate) return [];
        
        return allApprovedFundRequests.filter(req => {
            if (!req.date) return false;
            // Simple, timezone-agnostic string comparison
            return req.date >= currentWeek.startDate && req.date <= currentWeek.endDate;
        });

    }, [allApprovedFundRequests, currentWeek]);


    const certificationsQuery = useMemo(() => currentWeek && firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), and(where('payrollWeekId', '==', currentWeek.id), where('status', '==', 'Aprobado'))) : null, [currentWeek, firestore]);
    const { data: certifications, isLoading: l4 } = useCollection(certificationsQuery);

    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null, [firestore]);
    const { data: employees, isLoading: l5 } = useCollection(employeesQuery);

    const projectsQuery = useMemo(() => firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null, [firestore]);
    const { data: projects, isLoading: l6 } = useCollection(projectsQuery);
    
    const isLoadingData = isLoadingWeek || l1 || l3 || l4 || l5 || l6;

    // --- Calculation Logic ---
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

            const employeeMap = new Map(employees.map(e => [e.id, parseNumber(e.dailyWage)]));
            const projectMap = new Map<string, { id: string, name: string, personal: number, contratistas: number, solicitudes: number }>();
            projects.forEach(p => {
                if (p.id && p.name) projectMap.set(p.id, { id: p.id, name: p.name, personal: 0, contratistas: 0, solicitudes: 0 });
            });

            // PERSONAL
            let grossWages = 0;
            
            if (attendances) {
                attendances.forEach(att => {
                    const wage = employeeMap.get(att.employeeId);
                    if (att.status === 'presente' && wage !== undefined) {
                        const dailyGross = parseNumber(wage);
                        grossWages += dailyGross;
            
                        const proj = att.projectId ? projectMap.get(att.projectId) : undefined;
                        if (proj) {
                            proj.personal += dailyGross;
                        }
                    }
                });
            }
            
            const totalPersonal = grossWages;
            
            // CONTRATISTAS
            let totalContratistas = 0;
            if (certifications) {
                totalContratistas = certifications.reduce((sum, cert) => sum + parseNumber(cert.amount), 0);
                 certifications.forEach(cert => {
                    const proj = cert.projectId ? projectMap.get(cert.projectId) : undefined;
                    if (proj) {
                        proj.contratistas += parseNumber(cert.amount);
                    }
                });
            }
            
            // SOLICITUDES
            let totalSolicitudes = 0;
            if (fundRequests) {
                totalSolicitudes = fundRequests.reduce((sum, req) => {
                    const amount = parseNumber(req.amount);
                    const exchangeRate = parseNumber(req.exchangeRate) || 1;
                    return sum + (req.currency === 'USD' ? amount * exchangeRate : amount);
                }, 0);
                 fundRequests.forEach(req => {
                    const proj = req.projectId ? projectMap.get(req.projectId) : undefined;
                    if (proj) {
                        const amount = parseNumber(req.amount);
                        const exchangeRate = parseNumber(req.exchangeRate) || 1;
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
    }, [isLoadingData, currentWeek, attendances, fundRequests, certifications, employees, projects]);

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
                        <CardTitle>Costo Total Estimado de la Semana</CardTitle>
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
