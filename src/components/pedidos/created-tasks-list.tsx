'use client';

import { useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { TaskRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

export function CreatedTasksList() {
  const { user, firestore } = useUser();

  const tasksQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'taskRequests'),
            where('requesterId', '==', user.uid),
            orderBy('createdAt', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: tasks, isLoading } = useCollection<TaskRequest>(tasksQuery);

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
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
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && tasks?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No has creado ningún pedido todavía.
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
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    task.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                    task.status === 'Finalizado' && 'text-green-500 border-green-500'
                  )}
                >
                  {task.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
