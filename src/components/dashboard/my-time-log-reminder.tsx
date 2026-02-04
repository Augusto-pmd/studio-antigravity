'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { TechnicalOfficeEmployee, TimeLog } from '@/lib/types';
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval, addDays, Day } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { doc, collection, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import Link from 'next/link';

const techOfficeEmployeeConverter = {
    toFirestore: (data: any) => data, fromFirestore: (snapshot: any): TechnicalOfficeEmployee => ({ ...snapshot.data(), id: snapshot.id })
};

const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => {
        const data = snapshot.data(options)!;
        let dateStr: string = '';
        if (data.date) {
            // Handle both Firestore Timestamps and string dates
            if (data.date.toDate && typeof data.date.toDate === 'function') {
                dateStr = format(data.date.toDate(), 'yyyy-MM-dd');
            } else if (typeof data.date === 'string') {
                // Take only the date part if it's a full ISO string
                dateStr = data.date.split('T')[0];
            }
        }
        return {
            ...data,
            id: snapshot.id,
            date: dateStr,
        } as TimeLog;
    }
};


export function MyTimeLogReminder() {
    const { user, firestore } = useUser();
    const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Get the employee profile for the current user
    const employeeDocRef = useMemo(() => 
        user && firestore 
        ? doc(firestore, 'technicalOfficeEmployees', user.uid).withConverter(techOfficeEmployeeConverter) 
        : null, 
    [user, firestore]);
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<TechnicalOfficeEmployee>(employeeDocRef);

    // Define the week to check (last week)
    const { weekToCheckStart, workDays } = useMemo(() => {
        const today = new Date();
        const start = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const end = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end }).filter((day: Date) => day.getDay() >= 1 && day.getDay() <= 5); // Mon-Fri
        return { 
            weekToCheckStart: start, 
            workDays: days,
        };
    }, []);

    // Get time logs for the user for the specific week
    const timeLogsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const startDateStr = format(weekToCheckStart, 'yyyy-MM-dd');
        const endDateStr = format(endOfWeek(weekToCheckStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        return query(
            collection(firestore, 'timeLogs').withConverter(timeLogConverter),
            where('userId', '==', user.uid),
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
        );
    }, [user, firestore, weekToCheckStart]);
    const { data: weekLogs, isLoading: isLoadingLogs } = useCollection<TimeLog>(timeLogsQuery);

    const isLogComplete = useMemo(() => {
        if (isLoadingLogs || !weekLogs) return null; // Still loading
        const loggedDays = new Set(weekLogs.map((log: TimeLog) => log.date));
        const requiredDays = workDays.map((day: Date) => format(day, 'yyyy-MM-dd'));
        return requiredDays.every((dayStr: string) => loggedDays.has(dayStr));
    }, [weekLogs, workDays, isLoadingLogs]);

    useEffect(() => {
        setIsClient(true);
        const storedSnooze = localStorage.getItem('timeLogReminderSnoozeUntil');
        if (storedSnooze) {
            const snoozeTime = Number(storedSnooze);
            // Check if snooze is for the current week reminder
            const storedWeek = localStorage.getItem('timeLogReminderWeek');
            if (storedWeek === format(weekToCheckStart, 'yyyy-MM-dd')) {
                setSnoozeUntil(snoozeTime);
            }
        }
    }, [weekToCheckStart]);

    const handleSnooze = () => {
        const threeDaysFromNow = addDays(new Date(), 3).getTime();
        localStorage.setItem('timeLogReminderSnoozeUntil', String(threeDaysFromNow));
        // Store which week is being snoozed
        localStorage.setItem('timeLogReminderWeek', format(weekToCheckStart, 'yyyy-MM-dd'));
        setSnoozeUntil(threeDaysFromNow);
    };

    const shouldShowAlert = useMemo(() => {
        if (!isClient || isLoadingEmployee || isLoadingLogs || !employee || employee.status !== 'Activo' || isLogComplete === true || isLogComplete === null) {
            return false;
        }
        if (snoozeUntil && new Date().getTime() < snoozeUntil) {
            return false;
        }
        return true;
    }, [isClient, isLoadingEmployee, isLoadingLogs, employee, isLogComplete, snoozeUntil]);


    if (!shouldShowAlert) {
        return null;
    }

    return (
        <Card className="border-yellow-500/50 bg-yellow-500/5 mb-8">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                    <div>
                        <CardTitle className="text-yellow-600 dark:text-yellow-400">Recordatorio: Carga de Horas</CardTitle>
                        <CardDescription className="text-yellow-700/80 dark:text-yellow-500/80">
                            Aún no has completado tu planilla de horas de la semana del {format(weekToCheckStart, 'dd/MM/yyyy', { locale: es })}.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row justify-end gap-2">
                <Button asChild variant="ghost">
                    <Link href="/mis-horas">Cargar ahora</Link>
                </Button>
                <Button variant="outline" onClick={handleSnooze}>
                    Recordarme en 3 días
                </Button>
            </CardContent>
        </Card>
    );
}
