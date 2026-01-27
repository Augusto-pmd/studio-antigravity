'use client';

import { useMemo, useTransition, useState } from 'react';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TaskRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const taskRequestConverter = {
    toFirestore: (data: TaskRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TaskRequest => ({ ...snapshot.data(options), id: snapshot.id } as TaskRequest)
};

export function PendingTasksList() {
  const { user, firestore, permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const tasksQuery = useMemo(
    () => {
      if (!user || !firestore) return null;
      
      const tasksCollection = collection(firestore, 'taskRequests').withConverter(taskRequestConverter);

      if (permissions.canSupervise) {
        return query(tasksCollection, where('status', '==', 'Pendiente'), orderBy('createdAt', 'desc'));
      }
      
      return query(
        tasksCollection,
        where('assigneeId', '==', user.uid),
        where('status', '==', 'Pendiente'),
        orderBy('createdAt', 'desc')
      );
    },
    [user, firestore, permissions.canSupervise]
  );

  const { data: tasks, isLoading } = useCollection<TaskRequest>(tasksQuery);

  const handleCompleteTask = (taskId: string) => {
    if (!firestore) return;
    setUpdatingTaskId(taskId);
    startTransition(() => {
      const taskRef = doc(firestore, 'taskRequests', taskId);
      const updatedData = {
          status: 'Finalizado' as const,
          completedAt: new Date().toISOString(),
      };
      
      updateDoc(taskRef, updatedData)
          .then(() => {
              toast({ title: "¡Tarea completada!", description: "Has marcado la tarea como finalizada." });
          })
          .catch((error) => {
              console.error("Error writing to Firestore:", error);
              toast({
                variant: "destructive",
                title: "Error al completar",
                description: "No se pudo finalizar la tarea. Es posible que no tengas permisos.",
              });
          })
          .finally(() => {
            setUpdatingTaskId(null);
          });
    });
  };

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-32 rounded-md ml-auto" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarea</TableHead>
            <TableHead>Asignado a</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && tasks?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                ¡Excelente! No tienes tareas pendientes.
              </TableCell>
            </TableRow>
          )}
          {tasks?.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div className="font-medium">{task.title}</div>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
              </TableCell>
              <TableCell>{task.assigneeName}</TableCell>
              <TableCell>
                <div className="text-sm">{format(parseISO(task.createdAt), 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true, locale: es })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => handleCompleteTask(task.id)} disabled={isPending && updatingTaskId === task.id}>
                  {isPending && updatingTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Marcar como Finalizado
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
