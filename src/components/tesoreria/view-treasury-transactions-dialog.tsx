"use client";

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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useMemoFirebase } from "@/firebase";
import { useFirestore } from "@/firebase/provider";
import type { TreasuryAccount, TreasuryTransaction } from "@/lib/types";
import { collection, query, orderBy } from "firebase/firestore";
import { parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
}

export function ViewTreasuryTransactionsDialog({ account, children }: { account: TreasuryAccount, children: React.ReactNode }) {
  const firestore = useFirestore();
  const transactionsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `treasuryAccounts/${account.id}/transactions`), orderBy('date', 'desc')) : null,
    [firestore, account.id]
  );
  const { data: transactions, isLoading } = useCollection<TreasuryTransaction>(transactionsQuery);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Movimientos de {account.name}</DialogTitle>
          <DialogDescription>Historial de transacciones para esta cuenta.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skel-${i}`}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && transactions?.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay movimientos registrados.</TableCell></TableRow>
                    )}
                    {transactions?.map(tx => {
                        const isIncome = tx.type === 'Ingreso';
                        return (
                            <TableRow key={tx.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                                        <div>
                                            <p className="font-medium">{tx.category}</p>
                                            <p className="text-xs text-muted-foreground">{tx.description}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={cn("text-right font-mono", isIncome ? 'text-green-500' : 'text-destructive')}>
                                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
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
