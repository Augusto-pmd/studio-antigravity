'use client';

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
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase";
import type { CashAccount, CashTransaction, UserProfile } from "@/lib/types";
import { collection, query, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useMemo } from "react";

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};
const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
}

const transactionConverter = {
    toFirestore(transaction: CashTransaction): DocumentData {
        const { id, ...data } = transaction;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): CashTransaction {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            userId: data.userId,
            date: data.date,
            type: data.type,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            relatedExpenseId: data.relatedExpenseId,
            relatedProjectId: data.relatedProjectId,
            relatedProjectName: data.relatedProjectName,
            operatorId: data.operatorId,
            operatorName: data.operatorName,
        };
    }
};

export function ViewUserTransactionsDialog({ userProfile, account, children }: { userProfile: UserProfile, account: CashAccount, children: React.ReactNode }) {
  const firestore = useFirestore();
  const transactionsQuery = useMemo(
    () => firestore ? query(collection(firestore, `users/${userProfile.id}/cashAccounts/${account.id}/transactions`).withConverter(transactionConverter), orderBy('date', 'desc')) : null,
    [firestore, userProfile.id, account.id]
  );
  const { data: transactions, isLoading } = useCollection<CashTransaction>(transactionsQuery);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Movimientos de {account.name}</DialogTitle>
          <DialogDescription>Historial de transacciones de {userProfile.fullName}.</DialogDescription>
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
                    {transactions?.map((tx: CashTransaction) => {
                        const isIncome = tx.type === 'Ingreso' || tx.type === 'Refuerzo';
                        return (
                            <TableRow key={tx.id}>
                                <TableCell className="text-xs text-muted-foreground">{formatDate(tx.date)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {isIncome ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">{tx.type}</p>
                                            {tx.operatorName && (
                                                <p className="text-xs text-muted-foreground mt-1">Operado por: {tx.operatorName}</p>
                                            )}
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
