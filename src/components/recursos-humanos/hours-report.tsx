'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TechnicalOfficeEmployee, TimeLog, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

// Converters
const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => ({ ...snapshot.data(options), id: snapshot.id } as TechnicalOfficeEmployee)
};
const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => ({ ...snapshot.data(options), id: snapshot.id } as TimeLog)
};
const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

type ReportData = {
    projectId: string;
    projectName: string;
    totalHours: number;
    totalCost: number;
    employees: {
        employeeId: string;
        employeeName: string;
        hours: number;
        cost: number;
    }[];
}

export function HoursReport() {
    const firestore = useFirestore();
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Data Fetching
    const employeesQuery = useMemo(() => firestore ? query(collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter)) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection(employeesQuery);

    const timeLogsQuery = useMemo(() => firestore ? query(collection(firestore, 'timeLogs').withConverter(timeLogConverter)) : null, [firestore]);
    const { data: timeLogs, isLoading: isLoadingTimeLogs } = useCollection(timeLogsQuery);

    const projectsQuery = useMemo(() => firestore ? query(collection(firestore, 'projects').withConverter(projectConverter)) : null, [firestore]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection(projectsQuery);

    const isLoading = isLoadingEmployees || isLoadingTimeLogs || isLoadingProjects;

    const reportData = useMemo((): ReportData[] => {
        if (isLoading || !employees || !timeLogs || !projects) return [];

        const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        
        const logsForMonth = timeLogs.filter((log: TimeLog) => log.date >= monthStart && log.date <= monthEnd);

        if (logsForMonth.length === 0) return [];

        const employeeRateMap = new Map<string, { rate: number; name: string }>();
        employees.forEach((emp: TechnicalOfficeEmployee) => {
            employeeRateMap.set(emp.userId, { rate: (emp.monthlySalary || 0) / 160, name: emp.fullName }); // Assuming 160 hours/month
        });

        const projectsMap = new Map<string, string>();
        projects.forEach((proj: Project) => {
            projectsMap.set(proj.id, proj.name);
        });

        const reportByProject = new Map<string, ReportData>();

        logsForMonth.forEach((log: TimeLog) => {
            const employeeInfo = employeeRateMap.get(log.userId);
            if (!employeeInfo) return; // Skip logs from users not in office staff

            const cost = (log.hours || 0) * employeeInfo.rate;

            let projectReport = reportByProject.get(log.projectId);
            if (!projectReport) {
                projectReport = {
                    projectId: log.projectId,
                    projectName: projectsMap.get(log.projectId) || 'Obra no encontrada',
                    totalHours: 0,
                    totalCost: 0,
                    employees: []
                };
            }

            projectReport.totalHours += (log.hours || 0);
            projectReport.totalCost += cost;

            let employeeEntry = projectReport.employees.find(e => e.employeeId === log.userId);
            if (!employeeEntry) {
                employeeEntry = {
                    employeeId: log.userId,
                    employeeName: employeeInfo.name,
                    hours: 0,
                    cost: 0
                };
                projectReport.employees.push(employeeEntry);
            }
            
            employeeEntry.hours += (log.hours || 0);
            employeeEntry.cost += cost;

            reportByProject.set(log.projectId, projectReport);
        });
        
        return Array.from(reportByProject.values()).sort((a,b) => b.totalCost - a.totalCost);

    }, [isLoading, employees, timeLogs, projects, selectedMonth]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Reporte de Horas por Obra</CardTitle>
                        <CardDescription>Análisis de horas y costos de personal de oficina imputados a cada proyecto.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium capitalize text-center w-32">{format(selectedMonth, 'MMMM yyyy', { locale: es })}</span>
                         <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                        <p className="text-muted-foreground">No hay horas registradas para el mes seleccionado.</p>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {reportData.map((projectData) => (
                            <AccordionItem value={projectData.projectId} key={projectData.projectId} className="border rounded-lg bg-background">
                                <AccordionTrigger className="px-4 hover:no-underline text-left">
                                    <div className="flex items-center justify-between w-full flex-wrap gap-4">
                                        <span className="font-semibold">{projectData.projectName}</span>
                                        <div className="flex items-center gap-4 text-right">
                                            <div className="text-sm">
                                                <p className="font-mono font-bold">{projectData.totalHours.toFixed(1)} hs</p>
                                                <p className="text-xs text-muted-foreground">Total Horas</p>
                                            </div>
                                             <div className="text-sm">
                                                <p className="font-mono font-bold">{formatCurrency(projectData.totalCost)}</p>
                                                <p className="text-xs text-muted-foreground">Costo Total</p>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0 md:p-4">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Empleado</TableHead>
                                                    <TableHead className="text-right">Horas</TableHead>
                                                    <TableHead className="text-right">Costo Estimado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {projectData.employees.sort((a,b) => b.cost - a.cost).map(emp => (
                                                    <TableRow key={emp.employeeId}>
                                                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                                                        <TableCell className="text-right font-mono">{emp.hours.toFixed(1)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(emp.cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
