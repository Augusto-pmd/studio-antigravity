'use client';

import { useMemo } from 'react';
import type { UserProfile, TimeLog, TaskRequest, FundRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle, PlusCircle, Calendar } from 'lucide-react';

interface UserActivityCardProps {
    user: UserProfile;
    timeLogs: TimeLog[];
    createdTasks: TaskRequest[];
    assignedTasks: TaskRequest[];
    fundRequests: FundRequest[];
}

export function UserActivityCard({ user, timeLogs, createdTasks, assignedTasks, fundRequests }: UserActivityCardProps) {

    const metrics = useMemo(() => {
        const last7Days = subDays(new Date(), 7);
        
        const recentTimeLogs = timeLogs.filter((log: TimeLog) => parseISO(log.date) >= last7Days);
        const totalHoursLast7Days = recentTimeLogs.reduce((sum, log) => sum + (log.hours || 0), 0);

        const tasksCompleted = assignedTasks.filter((task: TaskRequest) => task.status === 'Finalizado').length;
        const tasksCreated = createdTasks.length;
        const fundsRequested = fundRequests.length;

        const allDates = [
            ...timeLogs.map(t => t.date),
            ...createdTasks.map(t => t.createdAt),
            ...fundRequests.map(r => r.date),
        ].filter(Boolean).map(d => parseISO(d));

        const lastActivityDate = allDates.length > 0 ? Math.max(...allDates.map(d => d.getTime())) : null;
        const lastActivity = lastActivityDate ? formatDistanceToNow(lastActivityDate, { addSuffix: true, locale: es }) : 'Nunca';
        
        return {
            totalHoursLast7Days,
            tasksCompleted,
            tasksCreated,
            fundsRequested,
            lastActivity,
        }
    }, [timeLogs, createdTasks, assignedTasks, fundRequests]);

    const stats = [
        { label: 'Tareas Completadas', value: metrics.tasksCompleted, icon: CheckCircle },
        { label: 'Pedidos Creados', value: metrics.tasksCreated, icon: PlusCircle },
        { label: 'Horas (últ. 7 días)', value: `${metrics.totalHoursLast7Days.toFixed(1)} hs`, icon: Clock },
    ];

    return (
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                 <Avatar>
                    <AvatarImage src={user.photoURL ?? undefined} />
                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>{user.fullName}</CardTitle>
                    <CardDescription>{user.role}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
                {stats.map((stat, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                           <stat.icon className="h-4 w-4" />
                           <span>{stat.label}</span>
                        </div>
                        <span className="font-semibold">{stat.value}</span>
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Última actividad: {metrics.lastActivity}</span>
                </div>
            </CardFooter>
        </Card>
    )
}
