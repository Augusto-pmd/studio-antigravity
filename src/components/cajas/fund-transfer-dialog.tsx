'use client';

import { useState, useTransition } from "react";
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
import { Loader2, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { UserProfile, CashAccount, CashTransaction } from "@/lib/types";

export function FundTransferDialog({ profile, arsAccount, usdAccount, children }: { profile: UserProfile, arsAccount?: CashAccount, usdAccount?: CashAccount, children: React.ReactNode }) {
  const { user: operator, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'Ingreso' | 'Refuerzo'>('Refuerzo');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setType('Refuerzo');
    setCurrency('ARS');
    setAmount('');
    setDescription('');
  }

  const handleSave = () => {
    if (!firestore || !operator) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
        return;
    }
    if (!amount || !description) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Monto y descripción son obligatorios.' });
        return;
    }

    const selectedAccount = currency === 'ARS' ? arsAccount : usdAccount;
    if (!selectedAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `El usuario ${profile.fullName} no tiene una caja en ${currency}.` });
        return;
    }
    
    const transferAmount = parseFloat(amount);

    startTransition(async () => {
        try {
            // 1. Create CashTransaction document
            const transactionRef = doc(collection(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}/transactions`));
            const newTransaction: CashTransaction = {
                id: transactionRef.id,
                userId: profile.id,
                date: new Date().toISOString(),
                type: type,
                amount: transferAmount,
                currency: currency,
                description: description,
                operatorId: operator.uid,
                operatorName: operator.displayName || undefined
            };
            setDocumentNonBlocking(transactionRef, newTransaction, {});

            // 2. Update CashAccount balance (read-then-write)
            const accountRef = doc(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}`);
            const newBalance = selectedAccount.balance + transferAmount;
            updateDocumentNonBlocking(accountRef, { balance: newBalance });

            toast({ title: 'Transferencia Realizada', description: `Se acreditaron ${formatCurrency(transferAmount, currency)} a la caja de ${profile.fullName}.` });
            resetForm();
            setOpen(false);

        } catch (error: any) {
            console.error("Error saving fund transfer:", error);
            toast({ variant: 'destructive', title: 'Error al transferir', description: error.message || 'No se pudo registrar el movimiento.' });
        }
    });
  }
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='w-full'>
          <Landmark className="mr-2 h-4 w-4" />
          Añadir Fondos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Fondos a {profile.fullName}</DialogTitle>
          <DialogDescription>
            Realice un ingreso o refuerzo a la caja del usuario.
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
          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup value={currency} onValueChange={(v: 'ARS' | 'USD') => setCurrency(v)} className="flex items-center gap-6 pt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ARS" id="ars-fund" />
                <Label htmlFor="ars-fund">ARS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="usd-fund" />
                <Label htmlFor="usd-fund">USD</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Movimiento</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Refuerzo semanal para viáticos" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !amount || !description}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    