'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { attendanceConverter } from '@/lib/converters';
import { Clock, CalendarX, CheckCircle, TrendingDown, UserX, Stethoscope, Palmtree, Ban } from 'lucide-react';
import { useYear } from '@/lib/contexts/year-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AttendanceStatsProps {
    employeeId: string;
}

interface Stats {
    lateHours: number;
    lateCount: number; // number of late events
    absences: number;
    reasons: Record<string, number>;
    totalDays: number;
    // Breakdown by reason
    faltasInjustificadas: number;
    enfermedades: number;
    vacaciones: number;
    licencias: number;
    otros: number;
}

const INITIAL_STATS: Stats = {
    lateHours: 0,
    lateCount: 0,
    absences: 0,
    reasons: {},
    totalDays: 0,
    faltasInjustificadas: 0,
    enfermedades: 0,
    vacaciones: 0,
    licencias: 0,
    otros: 0,
};

export function AttendanceStats({ employeeId }: AttendanceStatsProps) {
    const { selectedYear } = useYear();
    const [stats, setStats] = useState<Stats>(INITIAL_STATS);
    const [isLoading, setIsLoading] = useState(true);
    // Stable ref-based cache to avoid recreation on every render
    const cacheRef = useRef<Map<string, Stats>>(new Map());

    useEffect(() => {
        const fetchStats = async () => {
            const cacheKey = `${employeeId}-${selectedYear}`;
            const cached = cacheRef.current.get(cacheKey);

            if (cached) {
                setStats(cached);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const startStr = `${selectedYear}-01-01`;
                const endStr = `${selectedYear}-12-31`;

                // FIXED: correct collection name is 'attendance' (no trailing 's')
                const q = query(
                    collection(db, 'attendance').withConverter(attendanceConverter),
                    where('employeeId', '==', employeeId),
                    where('date', '>=', startStr),
                    where('date', '<=', endStr),
                    orderBy('date', 'desc')
                );

                const snapshot = await getDocs(q);

                let lateHours = 0;
                let lateCount = 0;
                let absences = 0;
                let faltasInjustificadas = 0;
                let enfermedades = 0;
                let vacaciones = 0;
                let licencias = 0;
                let otros = 0;
                const reasons: Record<string, number> = {};

                snapshot.docs.forEach(doc => {
                    const record = doc.data();
                    if (record.lateHours > 0) {
                        lateHours += record.lateHours;
                        lateCount++;
                    }
                    if (record.status === 'ausente') {
                        absences++;
                        const reason = record.reason || 'Sin justificar';
                        reasons[reason] = (reasons[reason] || 0) + 1;

                        // Breakdown
                        if (reason === 'Falta Injustificada') faltasInjustificadas++;
                        else if (reason === 'Enfermedad') enfermedades++;
                        else if (reason === 'Vacaciones') vacaciones++;
                        else if (reason === 'Licencia') licencias++;
                        else otros++;
                    }
                });

                // Total working days registered (presente + ausente)
                const totalDays = snapshot.size;

                const result: Stats = {
                    lateHours,
                    lateCount,
                    absences,
                    reasons,
                    totalDays,
                    faltasInjustificadas,
                    enfermedades,
                    vacaciones,
                    licencias,
                    otros,
                };

                cacheRef.current.set(cacheKey, result);
                setStats(result);
            } catch (error) {
                console.error("Error fetching attendance stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [employeeId, selectedYear]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-48" />
            </div>
        );
    }

    const presentDays = stats.totalDays - stats.absences;
    const attendanceRate = stats.totalDays > 0
        ? Math.round((presentDays / stats.totalDays) * 100)
        : 100;

    const getAttendanceBadge = (rate: number) => {
        if (rate >= 95) return { label: 'Excelente', variant: 'default' as const, color: 'bg-green-500' };
        if (rate >= 85) return { label: 'Bueno', variant: 'secondary' as const, color: 'bg-blue-500' };
        if (rate >= 75) return { label: 'Regular', variant: 'outline' as const, color: 'bg-yellow-500' };
        return { label: 'Deficiente', variant: 'destructive' as const, color: 'bg-red-500' };
    };

    const badge = getAttendanceBadge(attendanceRate);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Llegadas Tarde (Hs)</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lateHours.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">{stats.lateCount} evento(s) en {selectedYear}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ausencias Totales</CardTitle>
                        <CalendarX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.absences}</div>
                        <p className="text-xs text-muted-foreground">Días en {selectedYear}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Presentismo</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{presentDays}</div>
                        <p className="text-xs text-muted-foreground">Días presentes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{attendanceRate}%</div>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <Progress value={attendanceRate} className="mt-2 h-1.5" />
                    </CardContent>
                </Card>
            </div>

            {/* Desglose de Ausencias */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Desglose de Ausencias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(stats.reasons).length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No hay ausencias registradas en {selectedYear}.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.faltasInjustificadas > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><Ban className="h-4 w-4 text-red-500" /><span>Faltas Injustificadas</span></div>
                                        <span className="font-semibold text-red-600">{stats.faltasInjustificadas} días</span>
                                    </div>
                                )}
                                {stats.enfermedades > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-blue-500" /><span>Enfermedad</span></div>
                                        <span className="font-semibold">{stats.enfermedades} días</span>
                                    </div>
                                )}
                                {stats.vacaciones > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><Palmtree className="h-4 w-4 text-green-500" /><span>Vacaciones</span></div>
                                        <span className="font-semibold">{stats.vacaciones} días</span>
                                    </div>
                                )}
                                {stats.licencias > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><CalendarX className="h-4 w-4 text-purple-500" /><span>Licencias</span></div>
                                        <span className="font-semibold">{stats.licencias} días</span>
                                    </div>
                                )}
                                {stats.otros > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2"><UserX className="h-4 w-4 text-gray-500" /><span>Otros</span></div>
                                        <span className="font-semibold">{stats.otros} días</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Indicadores de Alerta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Faltas injustificadas</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{stats.faltasInjustificadas}</span>
                                {stats.faltasInjustificadas >= 3 && (
                                    <Badge variant="destructive" className="text-xs">⚠ Alerta</Badge>
                                )}
                                {stats.faltasInjustificadas < 3 && stats.faltasInjustificadas > 0 && (
                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">Atención</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Días por enfermedad</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{stats.enfermedades}</span>
                                {stats.enfermedades >= 10 && (
                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">Atención</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Horas tarde acumuladas</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{stats.lateHours.toFixed(1)} hs</span>
                                {stats.lateHours >= 8 && (
                                    <Badge variant="destructive" className="text-xs">⚠ Alerta</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Tasa de asistencia</span>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{attendanceRate}%</span>
                                <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
