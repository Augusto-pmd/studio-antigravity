'use client';

import { useState, useTransition, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Expense, TreasuryAccount, TreasuryTransaction } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

const treasuryAccountConverter = {
  toFirestore: (data: TreasuryAccount): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => ({ ...snapshot.data(), id: snapshot.id } as TreasuryAccount)
};

const paymentMethods = ["Transferencia", "Cheque", "Efectivo", "Mercado Pago", "Tarjeta", "Otros"];

export function PayExpenseDialog({ expense, children }: { expense: Expense, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [treasuryAccountId, setTreasuryAccountId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  
  const { firestore } = useUser();
  const { toast } = useToast();

  const treasuryAccountsQuery = useMemo(() => (
    firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null
  ), [firestore]);
  const { data: treasuryAccounts, isLoading } = useCollection<TreasuryAccount>(treasuryAccountsQuery);

  const selectedAccount = useMemo(() => treasuryAccounts?.find((a: TreasuryAccount) => a.id === treasuryAccountId), [treasuryAccounts, treasuryAccountId]);
  const hasSufficientFunds = selectedAccount && selectedAccount.balance >= expense.amount;

  const handlePayment = () => {
    if (!firestore || !treasuryAccountId || !paymentMethod || !selectedAccount) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Seleccione una cuenta de origen y un medio de pago.' });
      return;
    }

    if (!hasSufficientFunds) {
      toast({ variant: 'destructive', title: 'Saldo insuficiente', description: `La cuenta "${selectedAccount.name}" no tiene fondos suficientes.` });
      return;
    }
    
    startTransition(() => {
      const batch = writeBatch(firestore);

      // 1. Update Expense document
      const expenseRef = doc(firestore, `projects/${expense.projectId}/expenses`, expense.id);
      batch.update(expenseRef, {
        status: 'Pagado',
        paidDate: new Date().toISOString(),
        treasuryAccountId: treasuryAccountId,
        paymentMethod: paymentMethod,
      });

      // 2. Create TreasuryTransaction document
      const transactionRef = doc(collection(firestore, `treasuryAccounts/${treasuryAccountId}/transactions`));
      const newTransaction: Omit<TreasuryTransaction, 'id'> = {
        treasuryAccountId: treasuryAccountId,
        date: new Date().toISOString(),
        type: 'Egreso',
        amount: expense.amount,
        currency: expense.currency,
        category: 'Pago Proveedor',
        description: `Pago Gasto ID: ${expense.id}`,
        relatedDocumentId: expense.id,
        relatedDocumentType: 'Expense',
        projectId: expense.projectId,
      };
      batch.set(transactionRef, newTransaction);
      
      // 3. Update TreasuryAccount balance
      const accountRef = doc(firestore, 'treasuryAccounts', treasuryAccountId);
      const newBalance = selectedAccount.balance - expense.amount;
      batch.update(accountRef, { balance: newBalance });

      batch.commit()
        .then(() => {
          toast({ title: 'Pago Registrado', description: 'El gasto ha sido marcado como pagado y el saldo de la cuenta actualizado.' });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error processing payment:", error);
          toast({ variant: "destructive", title: "Error al Pagar", description: "No se pudo registrar el pago." });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago de Gasto</DialogTitle>
          <DialogDescription>
            Seleccione la cuenta de origen de los fondos para saldar esta factura.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border p-4">
            <div className='flex justify-between items-center'>
              <p className='text-sm text-muted-foreground'>Total a Pagar</p>
              <p className='text-2xl font-bold font-mono'>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: expense.currency }).format(expense.amount)}</p>
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
                {treasuryAccounts?.map((account: TreasuryAccount) => (
                  <SelectItem key={account.id} value={account.id} disabled={account.currency !== expense.currency}>
                    {account.name} (Saldo: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: account.currency }).format(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Medio de Pago</Label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Seleccione el medio de pago" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method: string) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePayment} disabled={isPending || !treasuryAccountId || !paymentMethod || !hasSufficientFunds}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
