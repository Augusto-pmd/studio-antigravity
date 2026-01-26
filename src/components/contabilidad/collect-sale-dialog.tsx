
'use client';

import { useState, useTransition, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Sale, TreasuryAccount, TreasuryTransaction } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const treasuryAccountConverter = {
  toFirestore: (data: TreasuryAccount): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => ({ ...snapshot.data(), id: snapshot.id } as TreasuryAccount)
};

export function CollectSaleDialog({ sale, children }: { sale: Sale, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [treasuryAccountId, setTreasuryAccountId] = useState<string | undefined>();
  
  const [retGanancias, setRetGanancias] = useState('');
  const [retIva, setRetIva] = useState('');
  const [retIibb, setRetIibb] = useState('');

  const { firestore } = useUser();
  const { toast } = useToast();

  const treasuryAccountsQuery = useMemo(() => (
    firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null
  ), [firestore]);
  const { data: treasuryAccounts, isLoading } = useCollection<TreasuryAccount>(treasuryAccountsQuery);

  const amountReceived = useMemo(() => {
    const total = sale.totalAmount;
    const rG = parseFloat(retGanancias) || 0;
    const rI = parseFloat(retIva) || 0;
    const rIIBB = parseFloat(retIibb) || 0;
    return total - rG - rI - rIIBB;
  }, [sale.totalAmount, retGanancias, retIva, retIibb]);

  const handleCollection = () => {
    if (!firestore || !treasuryAccountId) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Seleccione una cuenta de destino.' });
      return;
    }
    
    startTransition(() => {
      const batch = writeBatch(firestore);
      const saleRef = doc(firestore, `projects/${sale.projectId}/sales/${sale.id}`);
      const accountRef = doc(firestore, 'treasuryAccounts', treasuryAccountId);
      const transactionRef = doc(collection(firestore, `treasuryAccounts/${treasuryAccountId}/transactions`));
      
      const selectedAccount = treasuryAccounts?.find((a: TreasuryAccount) => a.id === treasuryAccountId);
      if (!selectedAccount) return;

      const retenciones = {
          retencionGanancias: parseFloat(retGanancias) || 0,
          retencionIVA: parseFloat(retIva) || 0,
          retencionIIBB: parseFloat(retIibb) || 0
      }

      // 1. Update Sale document
      batch.update(saleRef, {
        status: 'Cobrado',
        collectedDate: new Date().toISOString(),
        treasuryAccountId,
        ...retenciones
      });

      // 2. Create TreasuryTransaction document
      const newTransaction: Omit<TreasuryTransaction, 'id'> = {
        treasuryAccountId: treasuryAccountId,
        date: new Date().toISOString(),
        type: 'Ingreso',
        amount: amountReceived,
        currency: 'ARS', // Assuming ARS for now
        category: 'Cobro Cliente',
        description: `Cobro Venta ID: ${sale.id}`,
        relatedDocumentId: sale.id,
        relatedDocumentType: 'Sale',
        projectId: sale.projectId,
      };
      batch.set(transactionRef, newTransaction);
      
      // 3. Update TreasuryAccount balance
      const newBalance = selectedAccount.balance + amountReceived;
      batch.update(accountRef, { balance: newBalance });

      batch.commit()
        .then(() => {
          toast({ title: 'Cobro Registrado', description: 'La venta ha sido marcada como cobrada y el saldo de la cuenta actualizado.' });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error processing collection:", error);
          toast({ variant: "destructive", title: "Error al Registrar Cobro", description: "No se pudo registrar el cobro." });
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
          <DialogTitle>Registrar Cobro de Venta</DialogTitle>
          <DialogDescription>
            Registre las retenciones sufridas y seleccione la cuenta de destino del cobro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border p-4 space-y-2">
            <div className='flex justify-between items-center'>
              <p className='text-sm text-muted-foreground'>Total Facturado</p>
              <p className='text-lg font-bold font-mono'>{formatCurrency(sale.totalAmount)}</p>
            </div>
             <div className='flex justify-between items-center'>
              <p className='text-sm text-muted-foreground'>Monto a Recibir</p>
              <p className='text-2xl font-bold font-mono text-green-500'>{formatCurrency(amountReceived)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="treasuryAccount">Cuenta Destino</Label>
            <Select onValueChange={setTreasuryAccountId} value={treasuryAccountId} disabled={isLoading}>
              <SelectTrigger id="treasuryAccount">
                <SelectValue placeholder="Seleccione una cuenta de tesorería" />
              </SelectTrigger>
              <SelectContent>
                {treasuryAccounts?.filter((acc: TreasuryAccount) => acc.currency === 'ARS').map((account: TreasuryAccount) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (Saldo: {formatCurrency(account.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <h4 className="text-sm font-medium text-muted-foreground">Retenciones Sufridas</h4>

          <div className="grid grid-cols-3 gap-3">
             <div className="space-y-2">
                <Label htmlFor="retGanancias">Ganancias</Label>
                <Input id="retGanancias" type="number" placeholder="0.00" value={retGanancias} onChange={e => setRetGanancias(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="retIva">IVA</Label>
                <Input id="retIva" type="number" placeholder="0.00" value={retIva} onChange={e => setRetIva(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="retIibb">IIBB</Label>
                <Input id="retIibb" type="number" placeholder="0.00" value={retIibb} onChange={e => setRetIibb(e.target.value)} />
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button onClick={handleCollection} disabled={isPending || !treasuryAccountId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    