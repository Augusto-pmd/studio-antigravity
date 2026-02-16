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

import { techOfficeEmployeeConverter, timeLogConverter } from '@/lib/converters';

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

    if (defaulters.length === 0) return null;

    return (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between">
                <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-yellow-800">
                            Carga de Horas Incompleta ({defaulters.length})
                        </h4>
                        <p className="text-sm text-yellow-700">
                            Los siguientes empleados no han completado su planilla de la semana pasada:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {defaulters.map((emp) => (
                                <div key={emp.id} className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">
                                    <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-[9px]">{emp.fullName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {emp.fullName}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
