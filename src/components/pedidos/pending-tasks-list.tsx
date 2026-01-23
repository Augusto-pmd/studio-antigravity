'use client';

import { useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { TaskRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PendingTasksList() {
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const tasksQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'taskRequests'),
            where('assigneeId', '==', user.uid),
            where('status', '==', 'Pendiente')
          )
        : null,
    [user, firestore]
  );

  const { data: tasks, isLoading } = useCollection<TaskRequest>(tasksQuery);

  const handleCompleteTask = async (taskId: string) => {
    if (!firestore) return;
    try {
      const taskRef = doc(firestore, 'taskRequests', taskId);
      await updateDoc(taskRef, {
        status: 'Finalizado',
        completedAt: new Date().toISOString(),
      });
      toast({ title: "¡Tarea completada!", description: "Has marcado la tarea como finalizada." });
    } catch(error: any) {
      console.error("Error completing task:", error);
      toast({
        variant: "destructive",
        title: "Error al completar",
        description: error.message || "No se pudo finalizar la tarea.",
      });
    }
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
            <TableHead>Solicitado por</TableHead>
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
              <TableCell>{task.requesterName}</TableCell>
              <TableCell>
                <div className="text-sm">{format(parseISO(task.createdAt), 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true, locale: es })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
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
