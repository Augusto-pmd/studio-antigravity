'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, writeBatch, doc } from 'firebase/firestore';
import type { FundRequest, MonthlySalary, ContractorCertification } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecutePaymentDialog } from './execute-payment-dialog';
import { Boxes, FileText, UserCircle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    fundRequestConverter,
    monthlySalaryConverter,
    certificationConverter,
} from '@/lib/converters';

const formatCurrency = (amount: number, currency: string = 'ARS') => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};

export interface PendingPayment {
    id: string;
    sourceCollection: 'fundRequests' | 'monthlySalaries' | 'contractorCertifications';
    title: string;
    subtitle: string;
    type: string;
    amount: number;
    currency: 'ARS' | 'USD';
    date: string;
    originalDoc: FundRequest | MonthlySalary | ContractorCertification;
}

export function PendingPaymentsInbox() {
    const firestore = useFirestore();

    // 1. Fetch Fund Requests (Aprobados)
    const fundsQ = useMemo(() => firestore ? query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter), where('status', '==', 'Aprobado')) : null, [firestore]);
    const { data: funds, isLoading: loadingFunds } = useCollection<FundRequest>(fundsQ);

    // 2. Fetch Monthly Salaries (Pendientes)
    const salariesQ = useMemo(() => firestore ? query(collection(firestore, 'monthlySalaries').withConverter(monthlySalaryConverter), where('status', '==', 'Pendiente de Pago')) : null, [firestore]);
    const { data: salaries, isLoading: loadingSalaries } = useCollection<MonthlySalary>(salariesQ);

    // 3. Fetch Contractor Certifications (Aprobados)
    const certsQ = useMemo(() => firestore ? query(collection(firestore, 'contractorCertifications').withConverter(certificationConverter), where('status', '==', 'Aprobado')) : null, [firestore]);
    const { data: certs, isLoading: loadingCerts } = useCollection<ContractorCertification>(certsQ);

    const isLoading = loadingFunds || loadingSalaries || loadingCerts;

    const pendingPayments = useMemo(() => {
        const aggregated: PendingPayment[] = [];

        if (funds) {
            funds.forEach(f => {
                // CLEAN SLATE RULE: Ignore old funds from before this week
                if (f.date >= '2026-02-17') {
                    aggregated.push({
                        id: f.id,
                        sourceCollection: 'fundRequests',
                        title: f.description || f.category,
                        subtitle: `Solicitante: ${f.requesterName} | ${f.projectName || 'Sin Obra'}`,
                        type: 'Pedido de Fondos',
                        amount: f.amount,
                        currency: f.currency,
                        date: f.date,
                        originalDoc: f
                    });
                }
            });
        }

        if (salaries) {
            salaries.forEach(s => {
                // CLEAN SLATE RULE: Ignore old salaries from before this period
                if (s.period >= '2026-02') {
                    aggregated.push({
                        id: s.id,
                        sourceCollection: 'monthlySalaries',
                        title: `Sueldo ${s.period}`,
                        subtitle: `Oficina Técnica: ${s.employeeName}`,
                        type: 'Salario (Oficina)',
                        amount: s.netSalary,
                        currency: 'ARS', // Salaries are in ARS
                        date: s.period + '-01', // Approx date for sorting
                        originalDoc: s
                    });
                }
            });
        }

        if (certs) {
            certs.forEach(c => {
                // CLEAN SLATE RULE: Ignore old certs from before this week
                if (c.date >= '2026-02-17') {
                    aggregated.push({
                        id: c.id,
                        sourceCollection: 'contractorCertifications',
                        title: `Certificación Semanal`,
                        subtitle: `Subcontratista: ${c.contractorName} | ${c.projectName}`,
                        type: 'Certificación Obra',
                        amount: c.amount,
                        currency: c.currency,
                        date: c.date,
                        originalDoc: c
                    });
                }
            });
        }

        // Sort by date (oldest first, to pay them first)
        return aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [funds, salaries, certs]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'Salario (Oficina)': return <UserCircle className="h-5 w-5 text-blue-500" />;
            case 'Pedido de Fondos': return <Boxes className="h-5 w-5 text-orange-500" />;
            case 'Certificación Obra': return <FileText className="h-5 w-5 text-green-500" />;
            default: return <CreditCard className="h-5 w-5 text-gray-500" />;
        }
    }

    return (
        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            Bandeja de Pagos Pendientes (Tesorería)
                        </CardTitle>
                        <CardDescription className="pt-1.5">
                            Unified inbox for all approved debts waiting for physical payment.
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground font-medium">Deuda Total Consolidada</div>
                        <div className="text-2xl font-black font-mono text-primary">
                            {formatCurrency(pendingPayments.reduce((acc, p) => acc + (p.currency === 'ARS' ? p.amount : 0), 0), 'ARS')}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Concepto / Beneficiario</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha Ref.</TableHead>
                            <TableHead className="text-right">Monto a Pagar</TableHead>
                            <TableHead className="text-right w-[150px]">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48 mb-1" /><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : pendingPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-medium text-foreground">Bandeja Limpia</p>
                                        <p className="text-sm">No hay pagos semanales pendientes.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            pendingPayments.map((payment) => (
                                <TableRow key={payment.id} className="hover:bg-muted/30">
                                    <TableCell className="align-top pt-4">
                                        <div className="p-2 border rounded-full bg-background shadow-sm w-fit">
                                            {getIcon(payment.type)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-foreground/90">{payment.title}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{payment.subtitle}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal bg-background border shadow-sm">
                                            {payment.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                                        {formatDate(payment.date)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-base whitespace-nowrap">
                                        {formatCurrency(payment.amount, payment.currency)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ExecutePaymentDialog payment={payment} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
