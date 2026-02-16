'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { attendanceConverter } from '@/lib/converters';
import { Clock, AlertCircle, CalendarX, CheckCircle } from 'lucide-react';
import { useYear } from '@/lib/contexts/year-context';

interface AttendanceStatsProps {
    employeeId: string;
}

export function AttendanceStats({ employeeId }: AttendanceStatsProps) {
    const { selectedYear } = useYear();

    const startStr = `${selectedYear}-01-01`;
    const endStr = `${selectedYear}-12-31`;

    // Query all attendance for this employee in the selected year
    // Note: We might need a composite index on [employeeId, date]
    const q = query(
        collection(db, 'attendance').withConverter(attendanceConverter),
        where('employeeId', '==', employeeId),
        where('date', '>=', startStr),
        where('date', '<=', endStr),
        orderBy('date', 'desc')
    );

    const { data: attendanceRecords, isLoading } = useCollection(q);

    const stats = useMemo(() => {
        if (!attendanceRecords) return { lateHours: 0, absences: 0, reasons: {} as Record<string, number>, totalDays: 0 };

        let lateHours = 0;
        let absences = 0;
        const reasons: Record<string, number> = {};

        attendanceRecords.forEach(record => {
            if (record.lateHours > 0) {
                lateHours += record.lateHours;
            }
            if (record.status === 'ausente') {
                absences++;
                const reason = record.reason || 'Sin justificar';
                reasons[reason] = (reasons[reason] || 0) + 1;
            }
        });

        return { lateHours, absences, reasons, totalDays: attendanceRecords.length };
    }, [attendanceRecords]);

    if (isLoading) {
        return <div className="grid gap-4 md:grid-cols-3">Loading stats...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Llegadas Tarde (Hs)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lateHours}</div>
                        <p className="text-xs text-muted-foreground">Acumulado {selectedYear}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ausencias Totales</CardTitle>
                        <CalendarX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.absences}</div>
                        <p className="text-xs text-muted-foreground">Días en {selectedYear}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Presentismo</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDays - stats.absences}</div>
                        <p className="text-xs text-muted-foreground">Días presentes</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Desglose de Ausencias</CardTitle>
                </CardHeader>
                <CardContent>
                    {Object.keys(stats.reasons).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay ausencias registradas.</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(stats.reasons).map(([reason, count]) => (
                                <div key={reason} className="flex items-center justify-between text-sm">
                                    <span>{reason}</span>
                                    <span className="font-medium">{count} días</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
