'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { CashAccount, CashTransaction } from '@/lib/types';

export function InternalTransferDialog({
  accounts,
  children,
}: {
  accounts: CashAccount[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const [sourceAccountId, setSourceAccountId] = useState<string | undefined>();
  const [destinationAccountId, setDestinationAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const sourceAccount = useMemo(() => accounts.find((a: CashAccount) => a.id === sourceAccountId), [accounts, sourceAccountId]);

  const availableDestinationAccounts = useMemo(() => {
      return accounts.filter((a: CashAccount) => a.id !== sourceAccountId);
  }, [accounts, sourceAccountId]);

  useEffect(() => {
    if (sourceAccountId) {
        setDestinationAccountId(undefined);
    }
  }, [sourceAccountId]);

  const resetForm = () => {
    setSourceAccountId(undefined);
    setDestinationAccountId(undefined);
    setAmount('');
    setDescription('');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSave = () => {
    if (!firestore || !user) return;
    if (!sourceAccountId || !destinationAccountId || !amount) {
      return toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Debe seleccionar cuenta de origen, destino y un monto.' });
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return toast({ variant: 'destructive', title: 'Monto inválido', description: 'El monto debe ser un número positivo.' });
    }
    if (sourceAccount && sourceAccount.balance < transferAmount) {
      return toast({ variant: 'destructive', title: 'Saldo insuficiente', description: 'La cuenta de origen no tiene fondos suficientes.' });
    }
    
    startTransition(() => {
        const batch = writeBatch(firestore);
        const transferId = doc(collection(firestore, 'dummy')).id;

        const sourceAccount = accounts.find((a: CashAccount) => a.id === sourceAccountId)!;
        const destAccount = accounts.find((a: CashAccount) => a.id === destinationAccountId)!;

        // Transaction 1: Egreso from source
        const egresoRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${sourceAccountId}/transactions`));
        const egresoTx: Omit<CashTransaction, 'id'> = {
            userId: user.uid,
            date: new Date().toISOString(),
            type: 'Egreso',
            amount: transferAmount,
            currency: 'ARS',
            description: `Préstamo a ${destAccount.name}` + (description ? `: ${description}` : ''),
            isInternalLoan: true,
            loanStatus: 'Pendiente',
            transferId: transferId,
        };
        batch.set(egresoRef, egresoTx);
        
        // Transaction 2: Ingreso to destination
        const ingresoRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${destinationAccountId}/transactions`));
        const ingresoTx: Omit<CashTransaction, 'id'> = {
            userId: user.uid,
            date: new Date().toISOString(),
            type: 'Ingreso',
            amount: transferAmount,
            currency: 'ARS',
            description: `Préstamo desde ${sourceAccount.name}` + (description ? `: ${description}` : ''),
            isInternalLoan: true,
            loanStatus: 'Pendiente',
            transferId: transferId,
        };
        batch.set(ingresoRef, ingresoTx);
        
        // Update balances
        const sourceAccRef = doc(firestore, `users/${user.uid}/cashAccounts`, sourceAccountId);
        batch.update(sourceAccRef, { balance: sourceAccount.balance - transferAmount });
        
        const destAccRef = doc(firestore, `users/${user.uid}/cashAccounts`, destinationAccountId);
        batch.update(destAccRef, { balance: destAccount.balance + transferAmount });

        batch.commit()
            .then(() => {
                toast({ title: 'Préstamo registrado', description: 'La transferencia se ha completado.' });
                setOpen(false);
            })
            .catch((error) => {
                console.error("Error creating internal loan:", error);
                toast({ variant: 'destructive', title: 'Error al registrar el préstamo', description: 'No se pudo completar la operación.' });
            });
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Préstamo entre Cajas</DialogTitle>
          <DialogDescription>
            Transfiera dinero de una de sus cajas a otra. Esto se marcará como un préstamo pendiente de devolución.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="source-account">Caja Origen</Label>
                <Select onValueChange={setSourceAccountId} value={sourceAccountId}>
                    <SelectTrigger id="source-account"><SelectValue placeholder="Seleccione una caja" /></SelectTrigger>
                    <SelectContent>
                        {accounts.map((acc: CashAccount) => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, acc.currency)})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="destination-account">Caja Destino</Label>
                <Select onValueChange={setDestinationAccountId} value={destinationAccountId} disabled={!sourceAccountId}>
                    <SelectTrigger id="destination-account"><SelectValue placeholder="Seleccione una caja" /></SelectTrigger>
                    <SelectContent>
                        {availableDestinationAccounts.map((acc: CashAccount) => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, acc.currency)})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Para compra de materiales" />
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !sourceAccountId || !destinationAccountId || !amount}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Préstamo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
