"use client";

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { StockItem } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";
import { StockItemDialog } from './stock-item-dialog';
import { cn } from '@/lib/utils';

const stockItemConverter = {
    toFirestore: (data: StockItem): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StockItem => ({ ...snapshot.data(options), id: snapshot.id } as StockItem)
};

export function StockTable() {
  const firestore = useFirestore();
  const { permissions } = useUser();
  const stockQuery = useMemo(() => firestore ? query(collection(firestore, 'stockItems').withConverter(stockItemConverter), orderBy('name', 'asc')) : null, [firestore]);
  const { data: stockItems, isLoading } = useCollection(stockQuery);

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ítem</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Punto de Pedido</TableHead>
            {permissions.canManageStock && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeleton()}
          {!isLoading && stockItems?.length === 0 && (
            <TableRow><TableCell colSpan={permissions.canManageStock ? 5 : 4} className="h-24 text-center">No hay ítems en el stock.</TableCell></TableRow>
          )}
          {stockItems?.map((item) => {
            const isLowStock = item.reorderPoint !== undefined && item.quantity <= item.reorderPoint;
            return (
              <TableRow key={item.id} className={cn(isLowStock && 'bg-yellow-500/10 hover:bg-yellow-500/20')}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className={cn("font-mono", isLowStock && "font-bold text-destructive")}>
                    {item.quantity} {item.unit}
                  </div>
                </TableCell>
                <TableCell>{item.reorderPoint ?? 'N/A'}</TableCell>
                {permissions.canManageStock && (
                  <TableCell className="text-right">
                    <StockItemDialog item={item}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </StockItemDialog>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
