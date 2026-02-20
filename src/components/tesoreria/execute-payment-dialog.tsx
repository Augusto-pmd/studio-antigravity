'use client';

import { useState, useTransition, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection } from '@/firebase';
import { collection, collectionGroup, doc, query, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import type { PendingPayment } from './pending-payments-inbox';
import { format } from 'date-fns';
import { treasuryAccountConverter, cashAccountConverter } from '@/lib/converters';

const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

export function ExecutePaymentDialog({ payment }: { payment: PendingPayment }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch Accounts
    const treasuryQuery = useMemo(() => firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null, [firestore]);
    const { data: treasuryAccounts } = useCollection(treasuryQuery);

    const cashQuery = useMemo(() => firestore ? collectionGroup(firestore, 'cashAccounts').withConverter(cashAccountConverter) : null, [firestore]);
    const { data: cashAccounts } = useCollection(cashQuery);

    const allOptions = useMemo(() => {
        const ops: { id: string, name: string, type: 'treasury' | 'cash' }[] = [];
        if (treasuryAccounts) treasuryAccounts.forEach(a => ops.push({ id: a.id, name: `${a.name} (Tesoreria - ${a.currency})`, type: 'treasury' }));
        if (cashAccounts) cashAccounts.forEach(a => ops.push({ id: a.id, name: `${a.name} (Caja - ARS)`, type: 'cash' }));
        return ops;
    }, [treasuryAccounts, cashAccounts]);

    const handleConfirm = () => {
        if (!selectedAccountId) return toast({ variant: 'destructive', description: 'Debe seleccionar una cuenta origen.' });
        if (!firestore) return;

        startTransition(() => {
            const batch = writeBatch(firestore);
            const isTreasury = allOptions.find(o => o.id === selectedAccountId)?.type === 'treasury';

            // 1. Transaction to rest money
            if (isTreasury) {
                const txRef = doc(collection(firestore, 'treasuryAccounts', selectedAccountId, 'transactions'));
                batch.set(txRef, {
                    treasuryAccountId: selectedAccountId,
                    date: new Date().toISOString(),
                    type: 'Egreso',
                    amount: payment.amount,
                    currency: payment.currency,
                    description: `Pago Unificado: ${payment.title}`,
                    category: payment.type,
                    relatedDocumentId: payment.id,
                    relatedDocumentType: payment.sourceCollection
                });

                const accRef = doc(firestore, 'treasuryAccounts', selectedAccountId);
                batch.update(accRef, { balance: increment(-payment.amount) });
            } else {
                const txRef = doc(collection(firestore, 'cashTransactions'));
                batch.set(txRef, {
                    userId: 'tesoreria', // Fallback, could be fetched from cashAccount userId
                    date: new Date().toISOString(),
                    type: 'Gasto',
                    amount: payment.amount,
                    description: `Pago Unificado: ${payment.title}`,
                    operatorName: 'Tesoreria',
                    relatedDocumentId: payment.id,
                });
                const accRef = doc(firestore, 'cashAccounts', selectedAccountId);
                batch.update(accRef, { balance: increment(-payment.amount) });
            }

            // 2. Change original document status
            const originalRef = doc(firestore, payment.sourceCollection, payment.id);
            const statusTarget = payment.sourceCollection === 'monthlySalaries' ? 'Pagado' : 'Pagado'; // In salaries it's 'Pagado', in certs 'Pagado', in funds 'Pagado'

            batch.update(originalRef, {
                status: statusTarget,
                paidDate: new Date().toISOString(),
                treasuryAccountId: selectedAccountId // Store context where it was paid from
            });

            batch.commit()
                .then(() => {
                    toast({ title: 'Pago Realizado', description: 'El saldo ha sido descontado atómicamente.' });
                    setOpen(false);
                })
                .catch(err => {
                    console.error("Payment error", err);
                    toast({ variant: 'destructive', title: 'Error transaccional', description: 'Hubo un error restando el saldo.' });
                });
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 shadow-sm">
                    <DollarSign className="w-4 h-4 mr-1.5" /> Efectuar Pago
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Autorizar Transferencia / Pago Físico</DialogTitle>
                    <DialogDescription>
                        Seleccione de qué caja o cuenta bancaria saldrá el dinero para dar por cancelada esta deuda con <strong>{payment.title}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="p-4 rounded-md bg-muted/50 border flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Monto a Descontar:</span>
                        <span className="text-2xl font-mono font-black text-primary">
                            {formatCurrency(payment.amount, payment.currency)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label>Seleccionar Origen Monetario</Label>
                        <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ej: Banco Galicia o Caja Oficina" />
                            </SelectTrigger>
                            <SelectContent>
                                {allOptions.length === 0 ? <SelectItem value="none" disabled>No hay cuentas...</SelectItem> : (
                                    allOptions.map(opt => (
                                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={isPending || !selectedAccountId} className="bg-green-600 hover:bg-green-700 text-white">
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar Descuento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
