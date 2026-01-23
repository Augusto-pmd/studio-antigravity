"use client";

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
import { Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc } from "firebase/firestore";
import type { TreasuryAccount } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

export function AddTreasuryAccountDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [accountType, setAccountType] = useState<'Banco' | 'Efectivo'>('Banco');
  const [initialBalance, setInitialBalance] = useState('');
  const [cbu, setCbu] = useState('');

  const resetForm = () => {
    setName('');
    setCurrency('ARS');
    setAccountType('Banco');
    setInitialBalance('');
    setCbu('');
  }

  const handleSave = () => {
    if (!firestore) return toast({ variant: 'destructive', title: 'Error de conexión.' });
    if (!name || !initialBalance) return toast({ variant: 'destructive', title: 'Nombre y Saldo Inicial son obligatorios.' });

    startTransition(() => {
      const accountRef = doc(collection(firestore, 'treasuryAccounts'));
      const newAccount: TreasuryAccount = {
          id: accountRef.id,
          name,
          currency,
          accountType,
          balance: parseFloat(initialBalance) || 0,
          cbu: accountType === 'Banco' ? cbu : undefined
      };

      setDoc(accountRef, newAccount, { merge: false })
        .then(() => {
            toast({ title: 'Cuenta Creada', description: `La cuenta de tesorería "${name}" ha sido creada.` });
            resetForm();
            setOpen(false);
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: accountRef.path,
                operation: 'create',
                requestResourceData: newAccount,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo crear la cuenta. Es posible que no tengas permisos.' });
        });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Cuenta de Tesorería</DialogTitle>
          <DialogDescription>
            Registre una nueva cuenta bancaria o de efectivo para la empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Cuenta</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Banco Galicia ARS" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Tipo</Label>
                <RadioGroup value={accountType} onValueChange={(v: any) => setAccountType(v)} className="flex pt-2 gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Banco" id="banco" /><Label htmlFor="banco">Banco</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Efectivo" id="efectivo" /><Label htmlFor="efectivo">Efectivo</Label></div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label>Moneda</Label>
                <RadioGroup value={currency} onValueChange={(v: any) => setCurrency(v)} className="flex pt-2 gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="ARS" id="ars" /><Label htmlFor="ars">ARS</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="USD" id="usd" /><Label htmlFor="usd">USD</Label></div>
                </RadioGroup>
            </div>
          </div>
           {accountType === 'Banco' && (
            <div className="space-y-2">
              <Label htmlFor="cbu">CBU/CVU/Alias</Label>
              <Input id="cbu" value={cbu} onChange={e => setCbu(e.target.value)} placeholder="(Opcional)" />
            </div>
           )}
           <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo Inicial</Label>
            <Input id="initialBalance" type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0.00" />
           </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
