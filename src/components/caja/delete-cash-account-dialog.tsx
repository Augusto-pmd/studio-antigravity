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
import { useUser } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashAccount } from "@/lib/types";

const formatCurrency = (amount: number, currency: string = 'ARS') => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

export function DeleteCashAccountDialog({ children, cashAccount }: { children: React.ReactNode, cashAccount: CashAccount }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
      return;
    }

    startTransition(() => {
      const accountRef = doc(firestore, `users/${user.uid}/cashAccounts`, cashAccount.id);
      
      deleteDoc(accountRef)
        .then(() => {
          toast({ title: 'Caja Eliminada', description: `La caja "${cashAccount.name}" ha sido eliminada.` });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error deleting document:", error);
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar la caja. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => { e.stopPropagation(); }}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro que desea eliminar la caja?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la caja{" "}
            <span className="font-semibold">{cashAccount.name}</span> y todos sus movimientos.
            {cashAccount.balance > 0 && (
              <span className="mt-2 block font-bold text-destructive">
                ¡Atención! Esta caja tiene un saldo de {formatCurrency(cashAccount.balance, cashAccount.currency)} que se perderá.
              </span>
            )}
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
