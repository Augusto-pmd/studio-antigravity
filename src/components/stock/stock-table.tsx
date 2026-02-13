'use client';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, MoreVertical, History, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { StockItemDialog } from './stock-item-dialog';
import { StockMovementDialog } from './stock-movement-dialog';
import { StockMovementHistoryDialog } from './stock-movement-history-dialog';
import { cn } from '@/lib/utils';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const stockItemConverter = {
  toFirestore: (data: StockItem): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StockItem => ({ ...snapshot.data(options), id: snapshot.id } as StockItem)
};

export function StockTable() {
  const firestore = useFirestore();
  const { permissions } = useUser();
  const stockQuery = useMemo(() => firestore ? query(collection(firestore, 'stockItems').withConverter(stockItemConverter), orderBy('name', 'asc')) : null, [firestore]);
  const { data: stockItems, isLoading } = useCollection<StockItem>(stockQuery);

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right pr-6"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/20">
              <TableHead className="pl-6">Ítem</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Últ. Actualización</TableHead>
              {permissions.canManageStock && <TableHead className="text-right pr-6">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && renderSkeleton()}
            {!isLoading && stockItems?.length === 0 && (
              <TableRow><TableCell colSpan={permissions.canManageStock ? 5 : 4} className="h-24 text-center text-muted-foreground">No hay ítems en el stock.</TableCell></TableRow>
            )}
            {stockItems?.map((item: StockItem) => {
              const isLowStock = item.reorderPoint !== undefined && item.quantity <= item.reorderPoint;
              return (
                <TableRow key={item.id} className={cn("hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0", isLowStock && 'bg-red-500/5 hover:bg-red-500/10')}>
                  <TableCell className="pl-6 py-4">
                    <div className="font-semibold text-base text-foreground">{item.name}</div>
                    {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg bg-secondary/50 border-white/20 text-foreground/80">{item.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className={cn("font-mono font-medium", isLowStock ? "text-destructive" : "text-foreground")}>
                      {item.quantity} {item.unit}
                    </div>
                    {isLowStock && <Badge variant="destructive" className="mt-1 text-[10px] h-5 px-1.5">Bajo stock</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(parseISO(item.lastUpdated), { addSuffix: true, locale: es })}
                    </div>
                  </TableCell>
                  {permissions.canManageStock && (
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl bg-white/90 dark:bg-card/90 backdrop-blur-xl border-0 shadow-glass">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <StockMovementDialog item={item} movementType="Egreso">
                            <DropdownMenuItem onSelect={(e: any) => e.preventDefault()} className="rounded-lg focus:bg-primary/10 cursor-pointer">
                              <ArrowUpCircle className="mr-2 h-4 w-4 text-destructive" />
                              <span>Registrar Salida</span>
                            </DropdownMenuItem>
                          </StockMovementDialog>
                          <StockMovementDialog item={item} movementType="Ingreso">
                            <DropdownMenuItem onSelect={(e: any) => e.preventDefault()} className="rounded-lg focus:bg-primary/10 cursor-pointer">
                              <ArrowDownCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span>Registrar Entrada</span>
                            </DropdownMenuItem>
                          </StockMovementDialog>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <StockMovementHistoryDialog item={item}>
                            <DropdownMenuItem onSelect={(e: any) => e.preventDefault()} className="rounded-lg focus:bg-primary/10 cursor-pointer">
                              <History className="mr-2 h-4 w-4" />
                              <span>Ver Historial</span>
                            </DropdownMenuItem>
                          </StockMovementHistoryDialog>
                          <StockItemDialog item={item}>
                            <DropdownMenuItem onSelect={(e: any) => e.preventDefault()} className="rounded-lg focus:bg-primary/10 cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar Ítem</span>
                            </DropdownMenuItem>
                          </StockItemDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
