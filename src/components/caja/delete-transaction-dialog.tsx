"use client";

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
import { Loader2, Trash2 } from "lucide-react";
import { useUser } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashTransaction, CashAccount } from "@/lib/types";

export function DeleteTransactionDialog({ transaction, cashAccount }: { transaction: CashTransaction, cashAccount: CashAccount }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { firestore } = useUser();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!firestore || !transaction.relatedExpenseId || !transaction.relatedProjectId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se puede eliminar esta transacción.' });
      return;
    }

    startTransition(() => {
      const batch = writeBatch(firestore);

      // 1. Re-add amount to cash account balance
      const accountRef = doc(firestore, `users/${cashAccount.userId}/cashAccounts`, cashAccount.id);
      const newBalance = cashAccount.balance + transaction.amount;
      batch.update(accountRef, { balance: newBalance });
      
      // 2. Delete the related Expense document
      const expenseRef = doc(firestore, `projects/${transaction.relatedProjectId}/expenses`, transaction.relatedExpenseId);
      batch.delete(expenseRef);

      // 3. Delete the CashTransaction document
      const transactionRef = doc(firestore, `users/${cashAccount.userId}/cashAccounts/${cashAccount.id}/transactions`, transaction.id);
      batch.delete(transactionRef);
      
      batch.commit()
        .then(() => {
          toast({ title: 'Movimiento Eliminado', description: `El movimiento ha sido eliminado y el saldo de su caja fue restaurado.` });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error deleting transaction:", error);
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el movimiento. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => { e.stopPropagation(); }}>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro que desea eliminar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará el movimiento y el gasto de obra asociado. El monto será devuelto a su caja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
