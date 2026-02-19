'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { attendanceConverter } from '@/lib/converters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useYear } from '@/lib/contexts/year-context';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp, TrendingDown, BarChart2, Star, AlertTriangle,
    CalendarCheck, Clock, UserCheck, ClipboardList, CheckCircle2,
    Loader2, History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    employeeId: string;
    employeeName: string;
}

interface PeriodStats {
    absences: number;
    faltasInjustificadas: number;
    lateHours: number;
    lateCount: number;
    enfermedades: number;
    attendanceRate: number;
    totalDays: number;
}

interface EvaluationRecord {
    id: string;
    employeeId: string;
    period: string; // e.g. '2026-S1'
    periodLabel: string; // e.g. 'Primer Semestre 2026'
    scores: {
        asistencia: number;
        puntualidad: number;
        actitudGeneral: number;
        cumplimientoTareas: number;
        trabajoEquipo: number;
    };
    comments: string;
    createdAt: string;
    overallScore: number;
}

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Muy Malo', color: 'text-red-600' },
    2: { label: 'Malo', color: 'text-orange-600' },
    3: { label: 'Regular', color: 'text-yellow-600' },
    4: { label: 'Bueno', color: 'text-blue-600' },
    5: { label: 'Excelente', color: 'text-green-600' },
};

const CRITERIA = [
    { key: 'asistencia', label: 'Asistencia y Puntualidad', icon: CalendarCheck, description: 'Concurrencia regular y a tiempo' },
    { key: 'puntualidad', label: 'Cumplimiento de Horario', icon: Clock, description: 'Respeto del horario de entrada y salida' },
    { key: 'actitudGeneral', label: 'Actitud y Compromiso', icon: Star, description: 'Disposición, proactividad y responsabilidad' },
    { key: 'cumplimientoTareas', label: 'Cumplimiento de Tareas', icon: ClipboardList, description: 'Entrega en tiempo y forma de lo asignado' },
    { key: 'trabajoEquipo', label: 'Trabajo en Equipo', icon: UserCheck, description: 'Colaboración y relación con compañeros' },
] as const;

type CriteriaKey = typeof CRITERIA[number]['key'];

function getPeriodOptions() {
    const now = new Date();
    const year = now.getFullYear();
    return [
        { value: `${year}-S1`, label: `Primer Semestre ${year}`, start: `${year}-01-01`, end: `${year}-06-30` },
        { value: `${year}-S2`, label: `Segundo Semestre ${year}`, start: `${year}-07-01`, end: `${year}-12-31` },
        { value: `${year - 1}-S1`, label: `Primer Semestre ${year - 1}`, start: `${year - 1}-01-01`, end: `${year - 1}-06-30` },
        { value: `${year - 1}-S2`, label: `Segundo Semestre ${year - 1}`, start: `${year - 1}-07-01`, end: `${year - 1}-12-31` },
    ];
}

async function fetchPeriodStats(employeeId: string, start: string, end: string): Promise<PeriodStats> {
    const q = query(
        collection(db, 'attendance').withConverter(attendanceConverter),
        where('employeeId', '==', employeeId),
        where('date', '>=', start),
        where('date', '<=', end),
    );
    const snap = await getDocs(q);
    let absences = 0, faltasInjustificadas = 0, lateHours = 0, lateCount = 0, enfermedades = 0;
    snap.docs.forEach(d => {
        const r = d.data();
        if (r.status === 'ausente') {
            absences++;
            if (r.reason === 'Falta Injustificada') faltasInjustificadas++;
            if (r.reason === 'Enfermedad') enfermedades++;
        }
        if (r.lateHours > 0) { lateHours += r.lateHours; lateCount++; }
    });
    const totalDays = snap.size;
    const attendanceRate = totalDays > 0 ? Math.round(((totalDays - absences) / totalDays) * 100) : 100;
    return { absences, faltasInjustificadas, lateHours, lateCount, enfermedades, attendanceRate, totalDays };
}

export function PerformanceEvaluation({ employeeId, employeeName }: Props) {
    const { toast } = useToast();
    const periods = getPeriodOptions();

    const [selectedPeriod, setSelectedPeriod] = useState(periods[0].value);
    const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [isLoadingEvals, setIsLoadingEvals] = useState(true);

    const [scores, setScores] = useState<Record<CriteriaKey, number>>({
        asistencia: 0,
        puntualidad: 0,
        actitudGeneral: 0,
        cumplimientoTareas: 0,
        trabajoEquipo: 0,
    });
    const [comments, setComments] = useState('');
    const statsCache = useRef<Map<string, PeriodStats>>(new Map());

    // Load period stats
    useEffect(() => {
        const period = periods.find(p => p.value === selectedPeriod);
        if (!period) return;

        const cacheKey = `${employeeId}-${period.value}`;
        if (statsCache.current.has(cacheKey)) {
            setPeriodStats(statsCache.current.get(cacheKey)!);
            return;
        }

        setIsLoadingStats(true);
        fetchPeriodStats(employeeId, period.start, period.end)
            .then(stats => {
                statsCache.current.set(cacheKey, stats);
                setPeriodStats(stats);
            })
            .catch(console.error)
            .finally(() => setIsLoadingStats(false));
    }, [selectedPeriod, employeeId]);

    // Load past evaluations
    useEffect(() => {
        const q = query(
            collection(db, 'performanceEvaluations'),
            where('employeeId', '==', employeeId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        getDocs(q).then(snap => {
            setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationRecord)));
        }).catch(console.error).finally(() => setIsLoadingEvals(false));
    }, [employeeId]);

    // Auto-suggest scores based on stats
    useEffect(() => {
        if (!periodStats) return;
        const attendanceScore = periodStats.attendanceRate >= 95 ? 5 : periodStats.attendanceRate >= 85 ? 4 : periodStats.attendanceRate >= 75 ? 3 : periodStats.attendanceRate >= 60 ? 2 : 1;
        const punctualityScore = periodStats.lateHours <= 2 ? 5 : periodStats.lateHours <= 5 ? 4 : periodStats.lateHours <= 10 ? 3 : periodStats.lateHours <= 20 ? 2 : 1;
        setScores(prev => ({ ...prev, asistencia: attendanceScore, puntualidad: punctualityScore }));
    }, [periodStats]);

    const overallScore = Object.values(scores).filter(s => s > 0).length > 0
        ? Object.values(scores).reduce((a, b) => a + b, 0) / CRITERIA.length
        : 0;

    const getOverallLabel = (score: number) => {
        if (score >= 4.5) return { label: 'Desempeño Sobresaliente', color: 'text-green-600', badge: 'default' as const };
        if (score >= 3.5) return { label: 'Desempeño Bueno', color: 'text-blue-600', badge: 'secondary' as const };
        if (score >= 2.5) return { label: 'Desempeño Regular', color: 'text-yellow-600', badge: 'outline' as const };
        return { label: 'Desempeño Deficiente', color: 'text-red-600', badge: 'destructive' as const };
    };

    const handleSave = async () => {
        const incomplete = CRITERIA.some(c => scores[c.key] === 0);
        if (incomplete) {
            toast({ variant: 'destructive', title: 'Evaluación incompleta', description: 'Por favor calificá todos los criterios antes de guardar.' });
            return;
        }

        const period = periods.find(p => p.value === selectedPeriod)!;
        setIsSaving(true);
        try {
            const data = {
                employeeId,
                period: selectedPeriod,
                periodLabel: period.label,
                scores,
                comments,
                overallScore: Math.round(overallScore * 10) / 10,
                createdAt: new Date().toISOString(),
            };
            const ref = await addDoc(collection(db, 'performanceEvaluations'), data);
            setEvaluations(prev => [{ id: ref.id, ...data } as EvaluationRecord, ...prev]);
            toast({ title: 'Evaluación guardada', description: `Evaluación de ${period.label} registrada correctamente.` });
            setComments('');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la evaluación.' });
        } finally {
            setIsSaving(false);
        }
    };

    const overallInfo = overallScore > 0 ? getOverallLabel(overallScore) : null;

    return (
        <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Evaluación de Desempeño</h3>
                    <p className="text-sm text-muted-foreground">Evaluación semestral con métricas de asistencia y desempeño</p>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {periods.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats snapshot for the period */}
            <Card className="border-dashed">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart2 className="h-4 w-4" />
                        Datos del Período — {periods.find(p => p.value === selectedPeriod)?.label}
                    </CardTitle>
                    <CardDescription>Resumen automático de asistencia para este semestre</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingStats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                        </div>
                    ) : periodStats ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-green-600">{periodStats.attendanceRate}%</div>
                                <div className="text-xs text-muted-foreground">Asistencia</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-red-500">{periodStats.absences}</div>
                                <div className="text-xs text-muted-foreground">Ausencias</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-orange-500">{periodStats.faltasInjustificadas}</div>
                                <div className="text-xs text-muted-foreground">Injustificadas</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-orange-400">{periodStats.lateHours.toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Hs tarde</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-blue-500">{periodStats.enfermedades}</div>
                                <div className="text-xs text-muted-foreground">Días enferm.</div>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Scoring criteria */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Criterios de Evaluación</CardTitle>
                    <CardDescription>Calificá cada criterio del 1 (muy malo) al 5 (excelente). Los primeros dos se sugieren automáticamente según datos reales.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {CRITERIA.map(({ key, label, icon: Icon, description }) => (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm font-medium">{label}</div>
                                        <div className="text-xs text-muted-foreground">{description}</div>
                                    </div>
                                </div>
                                {scores[key] > 0 && (
                                    <span className={`text-xs font-semibold ${SCORE_LABELS[scores[key]].color}`}>
                                        {SCORE_LABELS[scores[key]].label}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setScores(prev => ({ ...prev, [key]: val }))}
                                        className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-all ${scores[key] === val
                                                ? val <= 2 ? 'bg-red-500 text-white border-red-500'
                                                    : val === 3 ? 'bg-yellow-500 text-white border-yellow-500'
                                                        : 'bg-green-500 text-white border-green-500'
                                                : 'bg-muted hover:bg-muted/80 border-transparent'
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Overall Score */}
                    {overallScore > 0 && overallInfo && (
                        <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">Puntaje General</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-bold ${overallInfo.color}`}>
                                        {overallScore.toFixed(1)} / 5
                                    </span>
                                    <Badge variant={overallInfo.badge}>{overallInfo.label}</Badge>
                                </div>
                            </div>
                            <Progress value={(overallScore / 5) * 100} className="h-2" />
                        </div>
                    )}

                    <div className="space-y-2 pt-2">
                        <Label>Comentarios del Evaluador (Opcional)</Label>
                        <Textarea
                            value={comments}
                            onChange={e => setComments(e.target.value)}
                            placeholder="Observaciones, logros destacados, áreas de mejora..."
                            rows={3}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Guardar Evaluación — {periods.find(p => p.value === selectedPeriod)?.label}
                    </Button>
                </CardContent>
            </Card>

            {/* History */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historial de Evaluaciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingEvals && <Skeleton className="h-24" />}
                    {!isLoadingEvals && evaluations.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">Aún no hay evaluaciones registradas para este empleado.</p>
                    )}
                    <div className="space-y-3">
                        {evaluations.map(ev => {
                            const info = getOverallLabel(ev.overallScore);
                            return (
                                <div key={ev.id} className="border rounded-lg p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-sm">{ev.periodLabel}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {ev.createdAt ? format(parseISO(ev.createdAt), "dd 'de' MMMM yyyy", { locale: es }) : ''}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg font-bold ${info.color}`}>{ev.overallScore}/5</span>
                                            <Badge variant={info.badge} className="text-xs">{info.label}</Badge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                        {CRITERIA.map(c => (
                                            <div key={c.key} className="space-y-0.5">
                                                <div className="text-muted-foreground truncate" title={c.label}>{c.label.split(' ')[0]}</div>
                                                <div className={`font-semibold ${SCORE_LABELS[ev.scores[c.key]]?.color}`}>{ev.scores[c.key]}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {ev.comments && (
                                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 italic">"{ev.comments}"</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
