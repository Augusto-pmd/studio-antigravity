'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Sale, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { parseISO, format } from 'date-fns';
import { CollectSaleDialog } from './collect-sale-dialog';

const saleConverter = {
  toFirestore: (data: Sale): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Sale => ({ ...snapshot.data(), id: snapshot.id } as Sale)
};

const projectConverter = {
  toFirestore: (data: Project): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(), id: snapshot.id } as Project)
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function AccountsReceivable() {
  const firestore = useFirestore();
  const { permissions } = useUser();

  const pendingSalesQuery = useMemo(() => (
    firestore ? query(collectionGroup(firestore, 'sales').withConverter(saleConverter), where('status', '==', 'Pendiente de Cobro')) : null
  ), [firestore]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(pendingSalesQuery);
  
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const projectsMap = useMemo(() => projects?.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>) || {}, [projects]);

  const isLoading = isLoadingSales || isLoadingProjects;

  const renderSkeleton = () => Array.from({ length: 2 }).map((_, i) => (
    <TableRow key={`skel-ar-${i}`}>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-9 w-24 rounded-md ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas por Cobrar</CardTitle>
        <CardDescription>Facturas de venta emitidas y pendientes de cobro.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Monto</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && renderSkeleton()}
              {!isLoading && sales?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No hay cuentas pendientes de cobro.</TableCell>
                </TableRow>
              )}
              {sales?.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="font-medium">{projectsMap[sale.projectId] || sale.projectId}</div>
                    <div className="text-sm text-muted-foreground">{sale.description}</div>
                     <div className="sm:hidden mt-2 font-mono font-semibold">{formatCurrency(sale.totalAmount)}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono hidden sm:table-cell">{formatCurrency(sale.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    {permissions.isSuperAdmin && (
                      <CollectSaleDialog sale={sale}>
                        <Button size="sm">Registrar Cobro</Button>
                      </CollectSaleDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
