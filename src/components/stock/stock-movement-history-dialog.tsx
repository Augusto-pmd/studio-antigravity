'use client';

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore } from "@/firebase";
import type { StockItem, StockMovement } from "@/lib/types";
import { collection, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
}

const movementConverter = {
    toFirestore: (data: StockMovement): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StockMovement => ({ ...snapshot.data(options), id: snapshot.id } as StockMovement)
};

export function StockMovementHistoryDialog({ item, children }: { item: StockItem, children: React.ReactNode }) {
  const firestore = useFirestore();
  const movementsQuery = useMemo(
    () => firestore ? query(collection(firestore, `stockItems/${item.id}/movements`).withConverter(movementConverter), orderBy('date', 'desc')) : null,
    [firestore, item.id]
  );
  const { data: movements, isLoading } = useCollection<StockMovement>(movementsQuery);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Historial de Movimientos: {item.name}</DialogTitle>
          <DialogDescription>Registro de entradas y salidas de este ítem.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Responsable/Obra</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({ length: 5 }).map((_: any, i: number) => (
                        <TableRow key={`skel-${i}`}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && movements?.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay movimientos registrados para este ítem.</TableCell></TableRow>
                    )}
                    {movements?.map((mov: StockMovement) => {
                        const isIngreso = mov.type === 'Ingreso';
                        return (
                            <TableRow key={mov.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDateTime(mov.date)}</TableCell>
                                <TableCell>
                                    <div className={cn("flex items-center gap-2 font-semibold", isIngreso ? 'text-green-500' : 'text-destructive')}>
                                        {isIngreso ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                                        <span>{mov.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono">{mov.quantity} {item.unit}</TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {mov.assigneeName && <p className="font-medium">{mov.assigneeName}</p>}
                                        {mov.projectName && <p className="text-muted-foreground">{mov.projectName}</p>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
