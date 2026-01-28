'use client';

import { useState, useTransition, useEffect, useMemo } from "react";
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
import { useUser, useCollection } from "@/firebase";
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { UserProfile, CashAccount, CashTransaction, TreasuryAccount, TreasuryTransaction } from "@/lib/types";

const treasuryAccountConverter = {
    toFirestore: (data: TreasuryAccount): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => ({ ...snapshot.data(options), id: snapshot.id } as TreasuryAccount)
};

export function FundTransferDialog({ profile, cashAccounts, children }: { profile: UserProfile, cashAccounts: CashAccount[], children: React.ReactNode }) {
  const { user: operator, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'Ingreso' | 'Refuerzo'>('Refuerzo');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [sourceAccountId, setSourceAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const isSelf = operator?.uid === profile.id;

  const treasuryAccountsQuery = useMemo(() => (firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null), [firestore]);
  const { data: treasuryAccounts, isLoading: isLoadingTreasuryAccounts } = useCollection<TreasuryAccount>(treasuryAccountsQuery);


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
    setSourceAccountId(undefined);
  }

  const handleSave = () => {
    if (!firestore || !operator) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
        return;
    }
    if (!amount || !description || !selectedAccountId || !sourceAccountId) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Debe completar todos los campos, incluyendo la cuenta de origen.' });
        return;
    }

    const selectedAccount = cashAccounts.find((acc: CashAccount) => acc.id === selectedAccountId);
    if (!selectedAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `La caja de destino no es válida.` });
        return;
    }
    
    const sourceAccount = treasuryAccounts?.find((acc: TreasuryAccount) => acc.id === sourceAccountId);
    if (!sourceAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `La cuenta de origen no es válida.` });
        return;
    }

    const transferAmount = parseFloat(amount);
    if (sourceAccount.balance < transferAmount) {
        toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: `No hay suficiente saldo en la cuenta de tesorería "${sourceAccount.name}".` });
        return;
    }

    startTransition(() => {
        const batch = writeBatch(firestore);

        // 1. Create User's CashTransaction document (Ingreso)
        const userTransactionRef = doc(collection(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}/transactions`));
        const newUserTransaction: Omit<CashTransaction, 'id'> = {
            userId: profile.id,
            date: new Date().toISOString(),
            type: type,
            amount: transferAmount,
            currency: 'ARS',
            description: description,
            operatorId: operator.uid,
            operatorName: operator.displayName || undefined
        };
        batch.set(userTransactionRef, newUserTransaction);

        // 2. Update User's CashAccount balance (increase)
        const userAccountRef = doc(firestore, `users/${profile.id}/cashAccounts/${selectedAccount.id}`);
        const newUserBalance = selectedAccount.balance + transferAmount;
        batch.update(userAccountRef, { balance: newUserBalance });

        // 3. Create TreasuryTransaction document (Egreso)
        const treasuryTransactionRef = doc(collection(firestore, `treasuryAccounts/${sourceAccount.id}/transactions`));
        const newTreasuryTransaction: Omit<TreasuryTransaction, 'id'> = {
            treasuryAccountId: sourceAccount.id,
            date: new Date().toISOString(),
            type: 'Egreso',
            amount: transferAmount,
            currency: sourceAccount.currency,
            description: `Refuerzo de caja para ${profile.fullName}. Motivo: ${description}`,
            category: 'Refuerzo Caja',
            relatedDocumentId: profile.id,
            relatedDocumentType: 'UserCashReinforcement',
        };
        batch.set(treasuryTransactionRef, newTreasuryTransaction);

        // 4. Update TreasuryAccount balance (decrease)
        const treasuryAccountRef = doc(firestore, 'treasuryAccounts', sourceAccount.id);
        const newTreasuryBalance = sourceAccount.balance - transferAmount;
        batch.update(treasuryAccountRef, { balance: newTreasuryBalance });

        batch.commit()
          .then(() => {
            toast({ title: 'Transferencia Realizada', description: `Se acreditaron ${formatCurrency(transferAmount, 'ARS')} a ${profile.fullName} desde ${sourceAccount.name}.` });
            resetForm();
            setOpen(false);
          })
          .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo completar la transferencia. Es posible que no tengas permisos.",
            });
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
            Seleccione la cuenta de origen de Tesorería y complete los detalles de la transferencia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-account">Origen de los Fondos (Tesorería)</Label>
            <Select onValueChange={setSourceAccountId} value={sourceAccountId} disabled={isLoadingTreasuryAccounts}>
              <SelectTrigger id="source-account">
                <SelectValue placeholder="Seleccione una cuenta de origen" />
              </SelectTrigger>
              <SelectContent>
                {treasuryAccounts?.map((account: TreasuryAccount) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (Saldo: {formatCurrency(account.balance, account.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <Label htmlFor="cash-account">Caja de Destino del Usuario</Label>
                <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                <SelectTrigger id="cash-account">
                    <SelectValue placeholder="Seleccione una caja de destino" />
                </SelectTrigger>
                <SelectContent>
                    {cashAccounts.map((account: CashAccount) => (
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
            <Input id="amount" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción / Motivo</Label>
            <Input id="description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Ej: Refuerzo semanal para viáticos" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !amount || !description || !selectedAccountId || !sourceAccountId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
