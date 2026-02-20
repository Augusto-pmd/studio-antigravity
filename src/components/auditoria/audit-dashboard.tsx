'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit, type QueryDocumentSnapshot, type SnapshotOptions, type DocumentData } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionTimeline } from "./action-timeline";
import { ShieldAlert, Users, History, Activity, AlertCircle, Clock, CheckSquare } from "lucide-react";
import { formatDistanceToNow, parseISO, subDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    type UserProfile,
    type TimeLog,
    type TaskRequest,
    type FundRequest,
} from '@/lib/types';
import {
    userProfileConverter,
    timeLogConverter,
    taskRequestConverter,
    fundRequestConverter
} from '@/lib/converters';
import type { ActionLog } from '@/lib/logger';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { UserActivityCard } from './user-activity-card';

const actionLogConverter = {
    toFirestore: (data: ActionLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ActionLog =>
        ({ ...snapshot.data(options), id: snapshot.id } as ActionLog)
};

type ComplianceData = {
    user: UserProfile;
    lastActiveDate: Date | null;
    hoursLast7Days: number;
    pendingTasksCount: number;
    completedTasksCount: number;
    status: 'active' | 'inactive' | 'warning';
};

export function AuditDashboard() {
    const firestore = useFirestore();

    // Fetching data
    const usersQuery = useMemo(() => firestore ? collection(firestore, 'users').withConverter(userProfileConverter) : null, [firestore]);
    const { data: users } = useCollection<UserProfile>(usersQuery);

    const logsQuery = useMemo(() => firestore ? query(collection(firestore, 'action_logs').withConverter(actionLogConverter), orderBy('timestamp', 'desc'), limit(500)) : null, [firestore]);
    const { data: logs } = useCollection<ActionLog>(logsQuery);

    const timeLogsQuery = useMemo(() => firestore ? collection(firestore, 'timeLogs').withConverter(timeLogConverter) : null, [firestore]);
    const { data: timeLogs } = useCollection<TimeLog>(timeLogsQuery);

    const tasksQuery = useMemo(() => firestore ? collection(firestore, 'taskRequests').withConverter(taskRequestConverter) : null, [firestore]);
    const { data: tasks } = useCollection<TaskRequest>(tasksQuery);

    const fundsQuery = useMemo(() => firestore ? collection(firestore, 'fundRequests').withConverter(fundRequestConverter) : null, [firestore]);
    const { data: funds } = useCollection<FundRequest>(fundsQuery);

    const complianceMatrix = useMemo(() => {
        if (!users) return [];

        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);

        return users.map((user): ComplianceData => {
            // 1. Last Active
            let lastActiveDate: Date | null = null;
            const userLogs = logs?.filter(l => l.userId === user.id) || [];
            if (userLogs.length > 0) {
                lastActiveDate = new Date(userLogs[0].timestamp);
            } else {
                // Fallback to latest timeLog/task/fund if no action_log exists
                const userTimeLogs = timeLogs?.filter(t => t.userId === user.id) || [];
                const userTasks = tasks?.filter(t => t.requesterId === user.id) || [];
                const userFunds = funds?.filter(f => f.requesterId === user.id) || [];

                const allDates = [
                    ...userTimeLogs.map(t => parseISO(t.date).getTime()),
                    ...userTasks.map(t => parseISO(t.createdAt).getTime()),
                    ...userFunds.map(f => parseISO(f.date).getTime())
                ].filter(d => !isNaN(d));

                if (allDates.length > 0) {
                    lastActiveDate = new Date(Math.max(...allDates));
                }
            }

            // 2. Hours Last 7 Days
            const recentHours = (timeLogs || [])
                .filter(t => t.userId === user.id && parseISO(t.date) >= sevenDaysAgo)
                .reduce((sum, t) => sum + (t.hours || 0), 0);

            // 3. Tasks
            const userAssignedTasks = tasks?.filter(t => t.assigneeId === user.id) || [];
            const pendingTasks = userAssignedTasks.filter(t => t.status === 'Pendiente').length;
            const completedTasks = userAssignedTasks.filter(t => t.status === 'Finalizado').length;

            // 4. Status Calculation
            let status: 'active' | 'inactive' | 'warning' = 'active';

            if (!lastActiveDate || differenceInHours(now, lastActiveDate) > 72) {
                status = 'inactive';
            } else if (pendingTasks > 5 || (user.role !== 'Dirección' && recentHours < 10 && differenceInHours(now, lastActiveDate) > 24)) {
                // Warning if many pending tasks, or very few hours registered recently (ignoring Directors)
                status = 'warning';
            }

            return {
                user,
                lastActiveDate,
                hoursLast7Days: recentHours,
                pendingTasksCount: pendingTasks,
                completedTasksCount: completedTasks,
                status,
            };
        }).sort((a, b) => {
            // Sort: Inactive first, then Warning, then Active
            const weight = { 'inactive': 3, 'warning': 2, 'active': 1 };
            if (weight[a.status] !== weight[b.status]) return weight[b.status] - weight[a.status];
            // Secondary sort by date
            if (!a.lastActiveDate) return 1;
            if (!b.lastActiveDate) return -1;
            return b.lastActiveDate.getTime() - a.lastActiveDate.getTime();
        });
    }, [users, logs, timeLogs, tasks, funds]);

    const globalMetrics = useMemo(() => {
        const activeToday = complianceMatrix.filter(c => c.lastActiveDate && differenceInHours(new Date(), c.lastActiveDate) <= 24).length;
        const inactiveAlerts = complianceMatrix.filter(c => c.status === 'inactive').length;
        return { activeToday, inactiveAlerts };
    }, [complianceMatrix]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios Activos (Hoy)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalMetrics.activeToday}</div>
                        <p className="text-xs text-muted-foreground">Personal conectado en las últimas 24hs</p>
                    </CardContent>
                </Card>
                <Card className={globalMetrics.inactiveAlerts > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas de Inactividad</CardTitle>
                        <AlertCircle className={globalMetrics.inactiveAlerts > 0 ? "h-4 w-4 text-red-500" : "h-4 w-4 text-muted-foreground"} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${globalMetrics.inactiveAlerts > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{globalMetrics.inactiveAlerts}</div>
                        <p className="text-xs text-muted-foreground">+72hs sin registrar actividad</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="compliance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="compliance" className="gap-2"><Users className="h-4 w-4" /> Cumplimiento de Personal</TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2"><History className="h-4 w-4" /> Línea de Tiempo</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2"><ShieldAlert className="h-4 w-4" /> Seguridad</TabsTrigger>
                </TabsList>

                <TabsContent value="compliance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Matriz de Actividad</CardTitle>
                            <CardDescription>
                                Monitoreo del uso del sistema, carga de horas y resolución de tareas asignadas por parte de cada usuario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario / Rol</TableHead>
                                            <TableHead>Último Acceso</TableHead>
                                            <TableHead className="text-center">Hrs Registradas (7 días)</TableHead>
                                            <TableHead className="text-center">Control de Tareas</TableHead>
                                            <TableHead className="text-center">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {complianceMatrix.map((row) => (
                                            <Dialog key={row.user.id}>
                                                <DialogTrigger asChild>
                                                    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={row.user.photoURL ?? undefined} />
                                                                    <AvatarFallback>{row.user.fullName.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium leading-none">{row.user.fullName}</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">{row.user.role}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-sm">
                                                                    {row.lastActiveDate ? formatDistanceToNow(row.lastActiveDate, { addSuffix: true, locale: es }) : 'Nunca'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-sm">
                                                            {row.hoursLast7Days > 0 ? `${row.hoursLast7Days} hs` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2 text-sm">
                                                                <span className={row.pendingTasksCount > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                                                                    {row.pendingTasksCount} Pend.
                                                                </span>
                                                                <span className="text-muted-foreground">/</span>
                                                                <span className="text-emerald-600">{row.completedTasksCount} Fin.</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {row.status === 'active' && <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Activo</Badge>}
                                                            {row.status === 'warning' && <Badge variant="outline" className="text-amber-600 border-amber-600">Atrasado</Badge>}
                                                            {row.status === 'inactive' && <Badge variant="destructive">Inactivo</Badge>}
                                                        </TableCell>
                                                    </TableRow>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <UserActivityCard
                                                        user={row.user}
                                                        timeLogs={timeLogs?.filter(t => t.userId === row.user.id) || []}
                                                        createdTasks={tasks?.filter(t => t.requesterId === row.user.id) || []}
                                                        assignedTasks={tasks?.filter(t => t.assigneeId === row.user.id) || []}
                                                        fundRequests={funds?.filter(f => f.requesterId === row.user.id) || []}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        ))}
                                        {complianceMatrix.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                    Cargando datos de personal...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Actividad</CardTitle>
                            <CardDescription>
                                Historial detallado de todas las acciones realizadas por el personal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ActionTimeline />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alertas de Seguridad</CardTitle>
                            <CardDescription>Monitor de accesos y acciones de alto riesgo.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-md border-dashed border">
                            <p>No se han detectado alertas de seguridad recientes.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
