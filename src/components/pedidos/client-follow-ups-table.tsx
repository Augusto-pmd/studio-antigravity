'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { ClientFollowUp } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, MoreHorizontal } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ClientFollowUpDialog } from './client-follow-up-dialog';
import { DeleteClientFollowUpDialog } from './delete-client-follow-up-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';

const followUpConverter = {
  toFirestore: (data: ClientFollowUp): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ClientFollowUp =>
    ({ ...snapshot.data(options), id: snapshot.id } as ClientFollowUp),
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(parseISO(dateString), 'dd/MM/yyyy');
}

export function ClientFollowUpsTable() {
  const firestore = useFirestore();

  const followUpsQuery = useMemo(() => firestore ? query(collection(firestore, 'clientFollowUps').withConverter(followUpConverter), orderBy('contactDate', 'desc')) : null, [firestore]);
  const { data: followUps, isLoading } = useCollection<ClientFollowUp>(followUpsQuery);

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i: number) => (
        <TableRow key={`skel-fu-${i}`}>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell><Skeleton className="h-9 w-9 rounded-md" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden sm:table-cell">Próx. Contacto</TableHead>
            <TableHead className="hidden md:table-cell">Próximo Paso</TableHead>
            <TableHead className="w-[50px] text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && followUps?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay seguimientos de clientes registrados.
              </TableCell>
            </TableRow>
          )}
          {followUps?.map((item: ClientFollowUp) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.clientName}</div>
                <div className="text-sm text-muted-foreground">{item.contactPerson}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(
                    'capitalize',
                    item.status === 'Cerrado - Ganado' && 'text-green-500 border-green-500',
                    item.status === 'Cerrado - Perdido' && 'text-destructive border-destructive',
                    item.status === 'En Negociación' && 'text-blue-500 border-blue-500',
                )}>{item.status}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(item.nextContactDate)}</TableCell>
              <TableCell className="hidden md:table-cell">{item.nextStep || '-'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ClientFollowUpDialog followUp={item}>
                      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Editar</span>
                      </div>
                    </ClientFollowUpDialog>
                    <DeleteClientFollowUpDialog followUp={item} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
