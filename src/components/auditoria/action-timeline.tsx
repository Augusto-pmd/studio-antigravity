'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Activity, Trash2, Edit, PlusCircle, LogIn, FileText,
    AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import type { ActionLog } from '@/lib/logger';

const actionLogConverter = {
    toFirestore: (data: ActionLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ActionLog =>
        ({ ...snapshot.data(options), id: snapshot.id } as ActionLog)
};

export function ActionTimeline() {
    const firestore = useFirestore();

    const logsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'action_logs').withConverter(actionLogConverter),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
    }, [firestore]);

    const { data: logs, isLoading } = useCollection<ActionLog>(logsQuery);

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Cargando actividad...</div>;
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-lg bg-muted/10 border-dashed">
                <Activity className="h-10 w-10 mb-2 opacity-20" />
                <p>No hay actividad registrada aún.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 p-4 border rounded-lg bg-background hover:bg-muted/20 transition-colors">
                        <div className="mt-1">
                            <ActionIcon action={log.action} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium leading-none">
                                    <span className="text-primary font-semibold">{log.userName}</span>
                                    <span className="text-muted-foreground font-normal"> {getActionVerb(log.action)} </span>
                                    <Badge variant="outline" className="text-xs ml-2">{log.entity}</Badge>
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{log.details}</p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mt-2 text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                    {JSON.stringify(log.metadata).slice(0, 100)}
                                    {JSON.stringify(log.metadata).length > 100 && '...'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

function ActionIcon({ action }: { action: string }) {
    switch (action) {
        case 'CREATE': return <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><PlusCircle className="h-4 w-4" /></div>;
        case 'UPDATE': return <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Edit className="h-4 w-4" /></div>;
        case 'DELETE': return <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><Trash2 className="h-4 w-4" /></div>;
        case 'LOGIN': return <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><LogIn className="h-4 w-4" /></div>;
        case 'APPROVE': return <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div>;
        case 'REJECT': return <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></div>;
        default: return <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"><Activity className="h-4 w-4" /></div>;
    }
}

function getActionVerb(action: string) {
    switch (action) {
        case 'CREATE': return 'creó';
        case 'UPDATE': return 'modificó';
        case 'DELETE': return 'eliminó';
        case 'LOGIN': return 'inició sesión';
        case 'EXPORT': return 'exportó';
        case 'APPROVE': return 'aprobó';
        case 'REJECT': return 'rechazó';
        default: return 'realizó una acción en';
    }
}
