'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TechnicalOfficeEmployee, TimeLog } from '@/lib/types';
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => ({ ...snapshot.data(options), id: snapshot.id } as TechnicalOfficeEmployee)
};

const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => ({ ...snapshot.data(options), id: snapshot.id } as TimeLog)
};

export function TimeLogAlerts() {
    const firestore = useFirestore();
    const [defaulters, setDefaulters] = useState<TechnicalOfficeEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const activeEmployeesQuery = useMemo(() => (
        firestore 
        ? query(
            collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter), 
            where('status', '==', 'Activo')
          ) 
        : null
    ), [firestore]);

    const { data: employees, isLoading: isLoadingEmployees } = useCollection<TechnicalOfficeEmployee>(activeEmployeesQuery);

    const { lastWeekStart, lastWeekEnd, workDays } = useMemo(() => {
        const today = new Date();
        const lastWeek = subWeeks(today, 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end }).filter((day: Date) => day.getDay() >= 1 && day.getDay() <= 5); // Mon-Fri
        return { lastWeekStart: start, lastWeekEnd: end, workDays: days };
    }, []);

    const timeLogsQuery = useMemo(() => {
        if (!firestore) return null;
        const startDateStr = format(lastWeekStart, 'yyyy-MM-dd');
        const endDateStr = format(lastWeekEnd, 'yyyy-MM-dd');
        return query(
            collection(firestore, 'timeLogs').withConverter(timeLogConverter),
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
        );
    }, [firestore, lastWeekStart, lastWeekEnd]);
    
    const { data: lastWeekLogs, isLoading: isLoadingLogs } = useCollection<TimeLog>(timeLogsQuery);

    useEffect(() => {
        if (isLoadingEmployees || isLoadingLogs) return;

        setIsLoading(true);

        if (!employees || !lastWeekLogs) {
            setIsLoading(false);
            return;
        }

        const employeesWhoDidntLog = employees.filter((employee: TechnicalOfficeEmployee) => {
            // Exclude 'Augusto Menendez' as requested
            if (employee.fullName === 'Augusto Menendez') {
                return false;
            }
            
            const logsForEmployee = lastWeekLogs.filter((log: TimeLog) => log.userId === employee.userId);
            const loggedDays = new Set(logsForEmployee.map((log: TimeLog) => log.date));
            const requiredDays = workDays.map((day: Date) => format(day, 'yyyy-MM-dd'));

            // Check if all required workdays have at least one log entry
            const hasLoggedAllDays = requiredDays.every((dayStr: string) => loggedDays.has(dayStr));

            return !hasLoggedAllDays;
        });

        setDefaulters(employeesWhoDidntLog);
        setIsLoading(false);

    }, [employees, lastWeekLogs, isLoadingEmployees, isLoadingLogs, workDays]);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />
    }
    
    if (defaulters.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <CheckCircle className="h-6 w-6 text-green-500" />
                        <div>
                            <CardTitle>Carga de Horas Completa</CardTitle>
                            <CardDescription>
                                Todo el personal de oficina técnica ha cargado sus horas de la semana anterior.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                    <div>
                        <CardTitle className="text-yellow-600 dark:text-yellow-400">Alerta: Carga de Horas Incompleta</CardTitle>
                        <CardDescription className="text-yellow-700/80 dark:text-yellow-500/80">
                            Los siguientes empleados no han completado su planilla de horas de la semana pasada.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {defaulters.map((employee: TechnicalOfficeEmployee) => (
                        <div key={employee.id} className="flex items-center justify-between rounded-md border border-yellow-500/20 bg-background p-3">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    {/* The UserProfile is not joined here, so no photo. We'll use a fallback. */}
                                    <AvatarFallback>{employee.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{employee.fullName}</p>
                                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
