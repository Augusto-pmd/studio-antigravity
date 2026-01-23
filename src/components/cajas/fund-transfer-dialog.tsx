"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import type { UserProfile, CashAccount, CashTransaction } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

export function FundTransferDialog({ profile, cashAccounts, children }: { profile: UserProfile, cashAccounts: CashAccount[], children: React.ReactNode }) {
  const { user: operator, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'Ingreso' | 'Refuerzo'>('Refuerzo');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const isSelf = operator?.uid === profile.id;

  useEffect(() => {
      if (open) {
        resetForm();
      }
      if (cashAccounts?.length === 1) {
          setSelectedAccountId(cashAccounts[0].id);
      }
  }, [cashAccounts, open]);


  const resetForm = () => {
    setType('Refuerzo');
    setAmount('');
    setDescription('');
    setSelectedAccountId(cashAccounts?.length === 1 ? cashAccounts[0].id : undefined);
  }

  const handleSave = () => {
    if (!firestore || !operator) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
        return;
    }
    if (!amount || !description || !selectedAccountId) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Caja, monto y descripción son obligatorios.' });
        return;
    }

    const selectedAccount = cashAccounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `La caja seleccionada no es válida.` });
        return;
    }
    
    const transferAmount = parseFloat(amount);

    startTransition(() => {
        const batch = writeBatch(firestore);

        // 1. Create CashTransaction document
        const transactionRef = doc(collection(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}/transactions`));
        const newTransaction: Omit<CashTransaction, 'id'> = {
            userId: profile.id,
            date: new Date().toISOString(),
            type: type,
            amount: transferAmount,
            currency: 'ARS',
            description: description,
            operatorId: operator.uid,
            operatorName: operator.displayName || undefined
        };
        batch.set(transactionRef, newTransaction);

        // 2. Update CashAccount balance
        const accountRef = doc(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}`);
        const newBalance = selectedAccount.balance + transferAmount;
        batch.update(accountRef, { balance: newBalance });
        
        batch.commit()
          .then(() => {
            toast({ title: 'Transferencia Realizada', description: `Se acreditaron ${formatCurrency(transferAmount, 'ARS')} a la caja "${selectedAccount.name}" de ${profile.fullName}.` });
            resetForm();
            setOpen(false);
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: `/users/${profile.id}/cashAccounts (batch)`,
                operation: 'update',
                requestResourceData: { amount: transferAmount, description }
            });
            errorEmitter.emit('permission-error', permissionError);
          });
    });
  }
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSelf ? "Añadir Fondos a Mi Caja" : `Añadir Fondos a ${profile.fullName}`}</DialogTitle>
          <DialogDescription>
            {isSelf ? "Realice un ingreso o refuerzo a una de sus cajas en ARS." : "Realice un ingreso o refuerzo a una de las cajas del usuario en ARS."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <RadioGroup value={type} onValueChange={(v: 'Ingreso' | 'Refuerzo') => setType(v)} className="flex items-center gap-6 pt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Refuerzo" id="refuerzo" />
                <Label htmlFor="refuerzo">Refuerzo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Ingreso" id="ingreso" />
                <Label htmlFor="ingreso">Ingreso</Label>
              </div>
            </RadioGroup>
          </div>
          
          {cashAccounts && cashAccounts.length > 1 && (
            <div className="space-y-2">
                <Label htmlFor="cash-account">Caja de Destino</Label>
                <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                <SelectTrigger id="cash-account">
                    <SelectValue placeholder="Seleccione una caja" />
                </SelectTrigger>
                <SelectContent>
                    {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                        {account.name} (Saldo: {formatCurrency(account.balance, 'ARS')})
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Monto (ARS)</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Movimiento</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Refuerzo semanal para viáticos" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !amount || !description || !selectedAccountId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
