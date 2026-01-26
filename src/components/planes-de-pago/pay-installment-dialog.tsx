'use client';

import { useState, useTransition, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Moratoria, TreasuryAccount, TreasuryTransaction } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { TriangleAlert } from 'lucide-react';
import { addMonths, format } from 'date-fns';

const treasuryAccountConverter = {
  toFirestore: (data: TreasuryAccount): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => ({ ...snapshot.data(), id: snapshot.id } as TreasuryAccount)
};

export function PayInstallmentDialog({ plan, children }: { plan: Moratoria, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [treasuryAccountId, setTreasuryAccountId] = useState<string | undefined>();
  
  const { firestore } = useUser();
  const { toast } = useToast();

  const treasuryAccountsQuery = useMemo(() => (
    firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null
  ), [firestore]);
  const { data: treasuryAccounts, isLoading } = useCollection<TreasuryAccount>(treasuryAccountsQuery);

  const selectedAccount = useMemo(() => treasuryAccounts?.find(a => a.id === treasuryAccountId), [treasuryAccounts, treasuryAccountId]);
  const hasSufficientFunds = selectedAccount && selectedAccount.balance >= plan.installmentAmount;

  const handlePayment = () => {
    if (!firestore || !treasuryAccountId || !selectedAccount) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Seleccione una cuenta de origen.' });
      return;
    }

    if (!hasSufficientFunds) {
      toast({ variant: 'destructive', title: 'Saldo insuficiente', description: `La cuenta "${selectedAccount.name}" no tiene fondos suficientes.` });
      return;
    }
    
    startTransition(() => {
      const batch = writeBatch(firestore);

      // 1. Update Moratoria document
      const planRef = doc(firestore, 'moratorias', plan.id);
      const newPaidAmount = plan.paidAmount + plan.installmentAmount;
      const newPaidInstallments = plan.paidInstallments + 1;
      const newStatus = newPaidInstallments === plan.installments ? 'Finalizada' : plan.status;
      const newNextDueDate = format(addMonths(new Date(plan.nextDueDate), 1), 'yyyy-MM-dd');
      
      batch.update(planRef, {
        paidAmount: newPaidAmount,
        paidInstallments: newPaidInstallments,
        status: newStatus,
        nextDueDate: newStatus === 'Activa' ? newNextDueDate : plan.nextDueDate
      });

      // 2. Create TreasuryTransaction document
      const transactionRef = doc(collection(firestore, `treasuryAccounts/${treasuryAccountId}/transactions`));
      const newTransaction: Omit<TreasuryTransaction, 'id'> = {
        treasuryAccountId: treasuryAccountId,
        date: new Date().toISOString(),
        type: 'Egreso',
        amount: plan.installmentAmount,
        currency: selectedAccount.currency,
        category: 'Pago de Impuestos (Moratoria)',
        description: `Pago cuota ${newPaidInstallments}/${plan.installments} de ${plan.name}`,
        relatedDocumentId: plan.id,
        relatedDocumentType: 'Moratoria',
      };
      batch.set(transactionRef, newTransaction);
      
      // 3. Update TreasuryAccount balance
      const accountRef = doc(firestore, 'treasuryAccounts', treasuryAccountId);
      const newBalance = selectedAccount.balance - plan.installmentAmount;
      batch.update(accountRef, { balance: newBalance });

      batch.commit()
        .then(() => {
          toast({ title: 'Pago Registrado', description: 'La cuota ha sido pagada y los saldos actualizados.' });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error processing payment:", error);
          toast({ variant: "destructive", title: "Error al Pagar", description: "No se pudo registrar el pago." });
        });
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Cuota de {plan.name}</DialogTitle>
          <DialogDescription>
            Pagar cuota {plan.paidInstallments + 1} de {plan.installments}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border p-4">
            <div className='flex justify-between items-center'>
              <p className='text-sm text-muted-foreground'>Monto de la Cuota</p>
              <p className='text-2xl font-bold font-mono'>{formatCurrency(plan.installmentAmount)}</p>
            </div>
          </div>
          
          {selectedAccount && !hasSufficientFunds && (
             <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Saldo Insuficiente</AlertTitle>
              <AlertDescription>
                La cuenta seleccionada no tiene fondos suficientes para cubrir este pago.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="treasuryAccount">Cuenta de Origen</Label>
            <Select onValueChange={setTreasuryAccountId} value={treasuryAccountId} disabled={isLoading}>
              <SelectTrigger id="treasuryAccount">
                <SelectValue placeholder="Seleccione una cuenta de tesorería" />
              </SelectTrigger>
              <SelectContent>
                {treasuryAccounts?.filter(acc => acc.currency === 'ARS').map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (Saldo: {formatCurrency(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePayment} disabled={isPending || !treasuryAccountId || !hasSufficientFunds}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Pago de Cuota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
