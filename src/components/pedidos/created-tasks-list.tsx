'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query, where, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { TaskRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, AlertCircle, Loader2 } from 'lucide-react';
import { DeleteTaskRequestDialog } from './delete-task-request-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


const taskRequestConverter = {
  toFirestore: (data: TaskRequest): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TaskRequest => ({ ...snapshot.data(options), id: snapshot.id } as TaskRequest)
};

export function CreatedTasksList({ filterByCurrentUser = false }: { filterByCurrentUser?: boolean }) {
  const { user, firestore, permissions } = useUser();
  const { toast } = useToast();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const tasksQuery = useMemo(
    () => {
      if (!user || !firestore) return null;

      const tasksCollection = collection(firestore, 'taskRequests').withConverter(taskRequestConverter);

      // If filtering by current user OR user cannot supervise (normal user), show own tasks
      if (filterByCurrentUser || !permissions.canSupervise) {
        return query(
          tasksCollection,
          where('requesterId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      // Otherwise (Director/Admin viewing all), show everything
      return query(tasksCollection, orderBy('createdAt', 'desc'));
    },
    [user, firestore, permissions.canSupervise, filterByCurrentUser]
  );

  const { data: tasks, isLoading } = useCollection<TaskRequest>(tasksQuery);

  const handleReiterate = async (task: TaskRequest) => {
    if (!firestore) return;
    setUpdatingTaskId(task.id);
    try {
      const taskRef = doc(firestore, 'taskRequests', task.id);
      await updateDoc(taskRef, {
        isUrgent: true,
        urgentAt: new Date().toISOString()
      });
      toast({ title: "Pedido reiterado", description: "Se ha marcado el pedido como urgente." });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo reiterar el pedido." });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-9 w-9 rounded-md" /></TableCell>
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
            <TableHead className="hidden md:table-cell">Asignado a</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px] text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && tasks?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No has creado ningún pedido todavía.
              </TableCell>
            </TableRow>
          )}
          {tasks?.map((task: TaskRequest) => {
            const canDelete = permissions.canSupervise || user?.uid === task.requesterId;
            return (
              <TableRow key={task.id} className={cn(task.isUrgent && task.status === 'Pendiente' && "bg-destructive/10 hover:bg-destructive/20 transition-colors")}>
                <TableCell>
                  <div className="font-medium">{task.title}</div>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground md:hidden">
                    <p><span className="font-medium text-foreground">De:</span> {task.requesterName}</p>
                    <p><span className="font-medium text-foreground">Para:</span> {task.assigneeName}</p>
                    <div className="text-xs pt-1 sm:hidden">
                      {safeDistanceToNow(task.createdAt)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{task.requesterName}</TableCell>
                <TableCell className="hidden md:table-cell">{task.assigneeName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="text-sm">{safeFormatDate(task.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">
                    {safeDistanceToNow(task.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      task.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                      task.status === 'Finalizado' && 'text-green-500 border-green-500'
                    )}
                  >
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {task.status === 'Pendiente' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReiterate(task)}
                      disabled={updatingTaskId === task.id || task.isUrgent}
                      className={cn("mr-2", task.isUrgent && "text-destructive border-destructive")}
                    >
                      {updatingTaskId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                      Reiterar
                    </Button>
                  )}
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}
