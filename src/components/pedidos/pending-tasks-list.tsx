'use client';

import { useMemo, useTransition, useState } from 'react';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TaskRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DeleteTaskRequestDialog } from './delete-task-request-dialog';

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
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-32 rounded-md ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd/MM/yyyy') : 'N/A';
  };

  const safeDistanceToNow = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = parseISO(dateStr);
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: es }) : '';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarea</TableHead>
            <TableHead className="hidden md:table-cell">Solicitado por</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
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
          {tasks?.map((task: TaskRequest) => {
            const canDelete = permissions.canSupervise || user?.uid === task.requesterId;
            return (
              <TableRow key={task.id} className={cn(task.isUrgent && "bg-destructive/10 hover:bg-destructive/20 transition-colors")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {task.isUrgent && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="font-medium">{task.title}</div>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground md:hidden">
                    <p><span className="font-medium text-foreground">De:</span> {task.requesterName}</p>
                    <div className="text-xs pt-1 sm:hidden">
                      {safeDistanceToNow(task.createdAt)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{task.requesterName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="text-sm">{safeFormatDate(task.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">
                    {safeDistanceToNow(task.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <Button size="sm" onClick={() => handleCompleteTask(task.id)} disabled={isPending && updatingTaskId === task.id}>
                      {isPending && updatingTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Marcar como Finalizado
                    </Button>
                    {canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DeleteTaskRequestDialog task={task} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}
