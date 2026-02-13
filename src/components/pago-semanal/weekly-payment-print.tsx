'use client';

import { useMemo, useCallback } from 'react';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, collectionGroup } from 'firebase/firestore';
import type { PayrollWeek, Employee, Attendance, CashAdvance, Project, ContractorCertification, FundRequest } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { payrollWeekConverter, employeeConverter, attendanceConverter, cashAdvanceConverter, projectConverter, certificationConverter, fundRequestConverter, dailyWageHistoryConverter } from '@/lib/converters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (amount: number, currency: string = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

export function WeeklyPaymentPrint({ weekId }: { weekId: string }) {
    const firestore = useFirestore();
    const { permissions } = useUser();

    // --- Data Fetching ---
    const weekDocRef = useMemo(() => firestore ? doc(firestore, 'payrollWeeks', weekId).withConverter(payrollWeekConverter) : null, [firestore, weekId]);
    const { data: week, isLoading: isLoadingWeek } = useDoc<PayrollWeek>(weekDocRef);

    const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'employees').withConverter(employeeConverter), where('status', '==', 'Activo')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const attendancesQuery = useMemo(() => firestore ? query(collection(firestore, 'attendances').withConverter(attendanceConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
    const { data: attendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendancesQuery);

    const advancesQuery = useMemo(() => firestore ? query(collection(firestore, 'cashAdvances').withConverter(cashAdvanceConverter), where('payrollWeekId', '==', weekId)) : null, [firestore, weekId]);
    const { data: advances, isLoading: isLoadingAdvances } = useCollection<CashAdvance>(advancesQuery);

    const certificationsQuery = useMemo(() => firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('payrollWeekId', '==', weekId), where('status', 'in', ['Aprobado', 'Pagado'])) : null, [firestore, weekId]);
    const { data: certifications, isLoading: isLoadingCerts } = useCollection<ContractorCertification>(certificationsQuery);

    const fundRequestsQuery = useMemo(() => firestore ? query(
        collection(firestore, 'fundRequests').withConverter(fundRequestConverter),
        where('status', 'in', ['Aprobado', 'Pagado'])
    ) : null, [firestore]);
    const { data: allFundRequests, isLoading: isLoadingFundRequests } = useCollection<FundRequest>(fundRequestsQuery);

    const wageHistoriesQuery = useMemo(() => (firestore && permissions.canSupervise ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore, permissions.canSupervise]);
    const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);

    const isLoading = isLoadingWeek || isLoadingEmployees || isLoadingAttendances || isLoadingAdvances || isLoadingCerts || isLoadingFundRequests || isLoadingWageHistories;

    // --- Logic & Calculations ---

    // 1. Filter Requests by Week
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
            } catch (e) { return false; }
        });
    }, [allFundRequests, week]);

    // 2. Wage Calculation Helper
    const getWageForDate = useCallback((employeeId: string, date: string): { wage: number, hourlyRate: number } => {
        const defaultWage = employees?.find(e => e.id === employeeId)?.dailyWage || 0;
        if (!wageHistories) return { wage: defaultWage, hourlyRate: defaultWage / 8 };

        const histories = wageHistories
            .filter(h => (h as any).employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

        const wage = histories.length > 0 ? histories[0].amount : defaultWage;
        return { wage, hourlyRate: wage / 8 };
    }, [wageHistories, employees]);

    // 3. Process Employee Data
    const employeeRows = useMemo(() => {
        if (!employees || !attendances) return [];
        return employees.map(emp => {
            const empAttendances = attendances.filter(a => a.employeeId === emp.id);
            const empAdvances = advances?.filter(a => a.employeeId === emp.id) || [];

            // Calculate Days & Gross
            const presentDays = empAttendances.filter(a => a.status === 'presente').length;
            let grossPay = 0;
            let lateHoursDeduction = 0;

            empAttendances.forEach(att => {
                if (att.status === 'presente') {
                    const { wage, hourlyRate } = getWageForDate(emp.id, att.date);
                    grossPay += wage;
                    if (att.lateHours > 0) {
                        lateHoursDeduction += att.lateHours * hourlyRate;
                    }
                }
            });

            const totalAdvances = empAdvances.reduce((sum, a) => sum + a.amount, 0);
            const netPay = grossPay - totalAdvances - lateHoursDeduction;

            return {
                id: emp.id,
                name: emp.name,
                category: emp.category,
                days: presentDays,
                gross: grossPay,
                advances: totalAdvances,
                lateDeduction: lateHoursDeduction,
                net: netPay
            };
        }).filter(row => row.gross > 0 || row.advances > 0); // Only show active
    }, [employees, attendances, advances, getWageForDate]);


    // 4. Totals
    const totalEmployees = employeeRows.reduce((acc, r) => acc + r.net, 0);
    const totalContractors = (certifications || []).reduce((acc, c) => acc + c.amount, 0); // Assuming ARS mostly or handle currency? simpler for now
    const totalRequests = weeklyFundRequests.reduce((acc, r) => acc + r.amount, 0);
    const grandTotal = totalEmployees + totalContractors + totalRequests;


    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin mr-2" /> Cargando planilla...</div>;
    if (!week) return <div>No se encontró la semana.</div>;

    return (
        <div className="p-8 bg-white max-w-[1200px] mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <Logo className="h-8 w-auto mb-2" />
                    <h1 className="text-2xl font-bold">Planilla de Pagos Semanal</h1>
                    <p className="text-muted-foreground">
                        Semana del {format(parseISO(week.startDate), 'dd/MM/yyyy')} al {format(parseISO(week.endDate), 'dd/MM/yyyy')}
                    </p>
                </div>
                <div className="no-print flex gap-2">
                    <Button variant="outline" onClick={() => window.close()}>Cerrar</Button>
                    <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                </div>
            </header>

            {/* 1. PERSONAL */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-2 uppercase tracking-wide border-l-4 border-primary pl-2">Personal</h2>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Empleado</TableHead>
                                <TableHead>Cat.</TableHead>
                                <TableHead className="text-center">Días</TableHead>
                                <TableHead className="text-right">Bruto</TableHead>
                                <TableHead className="text-right">Adelantos</TableHead>
                                <TableHead className="text-right">Hs. Tarde</TableHead>
                                <TableHead className="text-right font-bold text-black">Neto a Pagar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employeeRows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Sin movimientos de personal.</TableCell></TableRow>
                            ) : (
                                employeeRows.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{row.category}</TableCell>
                                        <TableCell className="text-center">{row.days}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(row.gross)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-600">
                                            {row.advances > 0 ? `-${formatCurrency(row.advances)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-600">
                                            {row.lateDeduction > 0 ? `-${formatCurrency(row.lateDeduction)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">{formatCurrency(row.net)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                            {/* Subtotal Personal */}
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableCell colSpan={6} className="text-right font-semibold">Total Personal:</TableCell>
                                <TableCell className="text-right font-bold text-lg">{formatCurrency(totalEmployees)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* 2. CONTRATISTAS */}
            <section className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-semibold mb-2 uppercase tracking-wide border-l-4 border-primary pl-2">Contratistas</h2>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Contratista</TableHead>
                                <TableHead>Obra</TableHead>
                                <TableHead>Detalle</TableHead>
                                <TableHead className="text-right font-bold text-black">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {certifications?.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sin pagos a contratistas.</TableCell></TableRow>
                            ) : (
                                certifications?.map(cert => (
                                    <TableRow key={cert.id}>
                                        <TableCell className="font-medium">{cert.contractorName}</TableCell>
                                        <TableCell>{cert.projectName}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{cert.notes || '-'}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{formatCurrency(cert.amount, cert.currency)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                            {/* Subtotal Contratistas */}
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableCell colSpan={3} className="text-right font-semibold">Total Contratistas:</TableCell>
                                <TableCell className="text-right font-bold text-lg">{formatCurrency(totalContractors)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* 3. SOLICITUDES */}
            <section className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-semibold mb-2 uppercase tracking-wide border-l-4 border-primary pl-2">Solicitudes de Fondos</h2>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Solicitante</TableHead>
                                <TableHead>Categoría / Obra</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right font-bold text-black">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeklyFundRequests.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sin solicitudes de fondos.</TableCell></TableRow>
                            ) : (
                                weeklyFundRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.requesterName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{req.category}</span>
                                                <span className="text-xs text-muted-foreground">{req.projectName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground italic max-w-[300px] truncate">{req.description || '-'}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{formatCurrency(req.amount, req.currency)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                            {/* Subtotal Solicitudes */}
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableCell colSpan={3} className="text-right font-semibold">Total Solicitudes:</TableCell>
                                <TableCell className="text-right font-bold text-lg">{formatCurrency(totalRequests)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* GRAND TOTAL */}
            <section className="mt-8 border-t-2 border-black pt-4 break-inside-avoid">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        <p>Generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        <p>Sistema de Gestión PMD</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-semibold uppercase text-muted-foreground">Total General de la Semana</p>
                        <p className="text-4xl font-bold">{formatCurrency(grandTotal)}</p>
                    </div>
                </div>
            </section>

        </div>
    );
}
