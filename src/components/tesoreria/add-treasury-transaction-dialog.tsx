"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, writeBatch } from "firebase/firestore";
import type { TreasuryAccount, TreasuryTransaction } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

export function AddTreasuryTransactionDialog({ account, children }: { account: TreasuryAccount, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Egreso');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setType('Egreso');
    setAmount('');
    setCategory('');
    setDescription('');
  };

  const handleSave = () => {
    if (!firestore) return toast({ variant: 'destructive', title: 'Error de conexión.' });
    if (!amount || !category || !description) return toast({ variant: 'destructive', title: 'Todos los campos son obligatorios.' });

    const transactionAmount = parseFloat(amount) || 0;
    if (type === 'Egreso' && transactionAmount > account.balance) {
      return toast({ variant: 'destructive', title: 'Saldo insuficiente en la cuenta.' });
    }

    startTransition(() => {
        const batch = writeBatch(firestore);

        // 1. Create transaction document
        const transactionRef = doc(collection(firestore, `treasuryAccounts/${account.id}/transactions`));
        const newTransaction: Omit<TreasuryTransaction, 'id'> = {
            treasuryAccountId: account.id,
            date: new Date().toISOString(),
            type,
            amount: transactionAmount,
            currency: account.currency,
            category,
            description,
        };
        batch.set(transactionRef, newTransaction);

        // 2. Update account balance
        const accountRef = doc(firestore, 'treasuryAccounts', account.id);
        const newBalance = type === 'Ingreso' ? account.balance + transactionAmount : account.balance - transactionAmount;
        batch.update(accountRef, { balance: newBalance });
    
        batch.commit()
            .then(() => {
                toast({ title: 'Movimiento Registrado', description: 'El movimiento ha sido guardado y el saldo actualizado.' });
                resetForm();
                setOpen(false);
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: `/treasuryAccounts/${account.id} (batch)`,
                    operation: 'update',
                    requestResourceData: { amount: transactionAmount, description, type }
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Error al guardar', description: "No se pudo guardar el movimiento. Es posible que no tengas permisos." });
            });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento en {account.name}</DialogTitle>
          <DialogDescription>Registre un nuevo ingreso o egreso en esta cuenta.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="flex pt-2 gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="Ingreso" id="ingreso" /><Label htmlFor="ingreso">Ingreso</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="Egreso" id="egreso" /><Label htmlFor="egreso">Egreso</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto ({account.currency})</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Cobro Cliente, Pago Proveedor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalle del movimiento" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
