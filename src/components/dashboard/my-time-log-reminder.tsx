
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { TechnicalOfficeEmployee, TimeLog } from '@/lib/types';
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { doc, collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { techOfficeEmployeeConverter, timeLogConverter } from '@/lib/converters';

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
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                    <span className="font-semibold">Recordatorio:</span> Aún no has completado tu planilla de horas ({format(weekToCheckStart, 'dd/MM', { locale: es })}).
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-yellow-700 font-semibold mx-2">
                    <Link href="/mis-horas">Cargar</Link>
                </Button>
                <div className="h-4 w-px bg-yellow-300 mx-1" />
                <Button variant="ghost" size="sm" onClick={handleSnooze} className="h-6 text-xs text-yellow-600 px-2 py-0 hover:bg-yellow-100 hover:text-yellow-800">
                    Posponer
                </Button>
            </div>
        </div>
    );
}
