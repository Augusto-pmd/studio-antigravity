'use client';

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { doc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashTransaction, CashAccount } from "@/lib/types";

export function SettleLoanDialog({ transaction, accounts }: { transaction: CashTransaction; accounts: CashAccount[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { firestore, user } = useUser();
  const { toast } = useToast();

  const handleSettle = () => {
    if (!firestore || !user || !transaction.transferId) {
        return toast({ variant: 'destructive', title: 'Error', description: 'No se puede saldar el préstamo.' });
    }

    startTransition(async () => {
      try {
        const batch = writeBatch(firestore);

        let originalTx1 = transaction;
        let originalTx2: CashTransaction | null = null;
        let account1: CashAccount | undefined;
        let account2: CashAccount | undefined;

        // Find account1 (the account of the current transaction)
        const currentAccount = accounts.find(acc => {
            // This is a bit of a hack since transaction doesn't have accountId
            // We find the account whose accordion is open, which is passed down
            // In a more complex app, we might need a better way to find this.
            // But for now, we find the account that contains this transaction.
            return true; 
        });

        // Let's find the current account by iterating
        for (const acc of accounts) {
            const q = query(collection(firestore, `users/${user.uid}/cashAccounts/${acc.id}/transactions`), where('transferId', '==', transaction.transferId));
            const snap = await getDocs(q);
            if (!snap.empty && snap.docs.some(d => d.id === transaction.id)) {
                account1 = acc;
                break;
            }
        }
        
        if (!account1) throw new Error("No se pudo encontrar la cuenta para la transacción actual.");

        // Find the other account and transaction
        for (const acc of accounts) {
          if (acc.id === account1.id) continue;
          const q = query(collection(firestore, `users/${user.uid}/cashAccounts/${acc.id}/transactions`), where('transferId', '==', transaction.transferId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            originalTx2 = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as CashTransaction;
            account2 = acc;
            break;
          }
        }

        if (!originalTx2 || !account2) throw new Error("No se pudo encontrar la transacción vinculada.");
        
        const sourceTx = originalTx1.type === 'Egreso' ? originalTx1 : originalTx2;
        const destTx = originalTx1.type === 'Ingreso' ? originalTx1 : originalTx2;
        const sourceAccount = originalTx1.type === 'Egreso' ? account1 : account2;
        const destAccount = originalTx1.type === 'Ingreso' ? account1 : account2;

        if (destAccount.balance < sourceTx.amount) {
          throw new Error(`Saldo insuficiente en la caja "${destAccount.name}" para saldar el préstamo.`);
        }

        const settlementDesc = `Devolución préstamo: ${sourceTx.description}`;
        
        // Settle Egreso from destAccount
        const settleEgresoRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${destAccount.id}/transactions`));
        batch.set(settleEgresoRef, { date: new Date().toISOString(), type: 'Egreso', amount: sourceTx.amount, currency: 'ARS', description: settlementDesc });

        // Settle Ingreso to sourceAccount
        const settleIngresoRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${sourceAccount.id}/transactions`));
        batch.set(settleIngresoRef, { date: new Date().toISOString(), type: 'Ingreso', amount: sourceTx.amount, currency: 'ARS', description: settlementDesc });

        // Update balances
        batch.update(doc(firestore, `users/${user.uid}/cashAccounts/${destAccount.id}`), { balance: destAccount.balance - sourceTx.amount });
        batch.update(doc(firestore, `users/${user.uid}/cashAccounts/${sourceAccount.id}`), { balance: sourceAccount.balance + sourceTx.amount });
        
        // Update status of original transactions
        batch.update(doc(firestore, `users/${user.uid}/cashAccounts/${sourceAccount.id}/transactions/${sourceTx.id}`), { loanStatus: 'Saldado' });
        batch.update(doc(firestore, `users/${user.uid}/cashAccounts/${destAccount.id}/transactions/${destTx.id}`), { loanStatus: 'Saldado' });
        
        await batch.commit();
        toast({ title: 'Préstamo Saldado', description: 'La devolución ha sido registrada y los saldos actualizados.' });
        setOpen(false);

      } catch (error: any) {
        console.error("Error settling loan:", error);
        toast({ variant: 'destructive', title: 'Error al saldar', description: error.message || "No se pudo completar la operación." });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">Saldar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar devolución del préstamo?</AlertDialogTitle>
          <AlertDialogDescription>
            Esto creará una transacción inversa para devolver los fondos y marcará el préstamo como "Saldado". Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSettle} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Devolución
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
