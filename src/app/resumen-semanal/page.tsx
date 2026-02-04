'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, and, doc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, limit, getDocs } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, FundRequest, ContractorCertification, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Handshake, HardHat, Calendar as CalendarIcon, Printer } from 'lucide-react';
import { format, parseISO, isValid, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { fundRequestConverter, employeeConverter, attendanceConverter, certificationConverter, projectConverter } from '@/lib/converters';


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

export default function ResumenSemanalPage() {
    const firestore = useFirestore();
    
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentWeek, setCurrentWeek] = useState<PayrollWeek | null>(null);
    const [isLoadingWeek, setIsLoadingWeek] = useState(true);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const findOrCreateWeek = async () => {
            setIsLoadingWeek(true);
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekStartISO = weekStart.toISOString();
            
            const q = query(collection(firestore, 'payrollWeeks'), where('startDate', '==', weekStartISO), limit(1));
            const weekSnap = await getDocs(q);

            let weekData: PayrollWeek;

            if (!weekSnap.empty) {
                weekData = { id: weekSnap.docs[0].id, ...weekSnap.docs[0].data() } as PayrollWeek;
            } else {
                const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
                const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
                weekData = {
                    id: newWeekRef.id,
                    startDate: weekStartISO,
                    endDate: weekEnd.toISOString(),
                };
                 await setDoc(newWeekRef, weekData);
            }
            setCurrentWeek(weekData);
            setIsLoadingWeek(false);
        };
        
        findOrCreateWeek();
    }, [selectedDate, firestore]);

    // --- Data Fetching Hooks ---
    const attendancesQuery = useMemo(() => {
        if (!currentWeek || !firestore) return null;
        return query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', currentWeek.id));
    }, [currentWeek, firestore]);
    const { data: attendances, isLoading: l1 } = useCollection(attendancesQuery);
    
    const fundRequestsQuery = useMemo(() => firestore ? query(
        collection(firestore, 'fundRequests').withConverter(fundRequestConverter),
        where('status', 'in', ['Pendiente', 'Aprobado', 'Pagado'])
    ) : null, [firestore]);
    const { data: allFundRequests, isLoading: l3 } = useCollection(fundRequestsQuery);

    const fundRequests = useMemo(() => {
        if (!allFundRequests || !currentWeek) return [];
        const weekStart = parseISO(currentWeek.startDate);
        const weekEnd = parseISO(currentWeek.endDate);
        weekEnd.setHours(23, 59, 59, 999); 

        return allFundRequests.filter(req => {
            if (!req.date) return false;
            try {
                const reqDate = parseISO(req.date);
                return reqDate >= weekStart && reqDate <= weekEnd;
            } catch (e) {
                console.error(`Invalid date format for fund request ${req.id}: ${req.date}`);
                return false;
            }
        });
    }, [allFundRequests, currentWeek]);

    const certificationsQuery = useMemo(() => {
        if (!currentWeek || !firestore) return null;
        return query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('payrollWeekId', '==', currentWeek.id), where('status', 'in', ['Pendiente', 'Aprobado', 'Pagado']));
    }, [currentWeek, firestore]);
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

            const employeeMap = new Map(employees.map(e => [e.id, e.dailyWage]));
            const projectMap = new Map<string, { id: string, name: string, personal: number, contratistas: number, solicitudes: number }>();
            projects.forEach(p => {
                if (p.id && p.name) projectMap.set(p.id, { id: p.id, name: p.name, personal: 0, contratistas: 0, solicitudes: 0 });
            });

            // PERSONAL
            const totalPersonal = (attendances || []).reduce((sum, att) => {
                if (att.status === 'presente') {
                    const dailyGross = employeeMap.get(att.employeeId) || 0;
                    
                    if (att.projectId && projectMap.has(att.projectId)) {
                        projectMap.get(att.projectId)!.personal += dailyGross;
                    }
                    return sum + dailyGross;
                }
                return sum;
            }, 0);
            
            // CONTRATISTAS
            const totalContratistas = (certifications || []).reduce((sum, cert) => {
                const amount = cert.amount;
                if (cert.projectId && projectMap.has(cert.projectId)) {
                    projectMap.get(cert.projectId)!.contratistas += amount;
                }
                return sum + amount;
            }, 0);
            
            // SOLICITUDES
            const totalSolicitudes = (fundRequests || []).reduce((sum, req) => {
                const amount = req.currency === 'USD' ? req.amount * req.exchangeRate : req.amount;
                if (req.projectId && projectMap.has(req.projectId)) {
                    projectMap.get(req.projectId)!.solicitudes += amount;
                }
                return sum + amount;
            }, 0);

            const grandTotal = totalPersonal + totalContratistas + totalSolicitudes;
            const breakdown = Array.from(projectMap.values()).filter(p => p.personal || p.contratistas || p.solicitudes);
            
            const finalSummary = {
                totalPersonal,
                totalContratistas,
                totalSolicitudes,
                grandTotal,
                breakdown,
            };

            setSummary(finalSummary);

        } catch (error) {
            console.error("FATAL: Calculation logic in ResumenSemanalPage failed.", error);
            setSummary(defaultResult);
        } finally {
            setIsCalculating(false);
        }
    }, [isLoadingData, currentWeek, attendances, fundRequests, certifications, employees, projects]);

    const summaryCards = [
        { title: 'Total Personal', value: summary?.totalPersonal ?? 0, icon: HardHat },
        { title: 'Total Contratistas', value: summary?.totalContratistas ?? 0, icon: Handshake },
        { title: 'Total Solicitudes', value: summary?.totalSolicitudes ?? 0, icon: Briefcase },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-headline">Resumen Semanal de Pagos</h1>
                    <p className="mt-1 text-muted-foreground">
                        Vista consolidada de todos los pagos proyectados para la semana seleccionada.
                    </p>
                </div>
                {currentWeek && (
                     <Button asChild>
                        <Link href={`/imprimir-resumen?startDate=${currentWeek.startDate}&endDate=${currentWeek.endDate}`} target="_blank">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Resumen
                        </Link>
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Selector de Semana</CardTitle>
                    <CardDescription>Elija una fecha para ver el resumen de esa semana.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn('w-full justify-start text-left font-normal text-lg', !selectedDate && 'text-muted-foreground')}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentWeek ? (
                                <span>{format(parseISO(currentWeek.startDate), 'dd/MM/yy', {locale: es})} al {format(parseISO(currentWeek.endDate), 'dd/MM/yy', {locale: es})}</span>
                            ) : (
                                <span>Seleccione una fecha</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                            locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            {isCalculating || isLoadingWeek ? (
                 <div className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : (
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
                            <CardDescription>Costos totales por proyecto para la semana seleccionada.</CardDescription>
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
            )}
        </div>
    );
}
