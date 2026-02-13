'use client';

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, LockKeyhole } from "lucide-react";
import { useUser } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { CashAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";

export function WeeklyClosureDialog({ cashAccount, children }: { cashAccount: CashAccount, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { firestore, user } = useUser();
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [notes, setNotes] = useState('');

    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');

    const handleClose = async () => {
        if (!firestore || !user) return;

        setIsPending(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Create Closure Record
            const closuresCollection = collection(firestore, `users/${user.uid}/cashClosures`);
            const closureRef = doc(closuresCollection);

            batch.set(closureRef, {
                id: closureRef.id,
                cashAccountId: cashAccount.id,
                date: formattedToday,
                amount: cashAccount.balance,
                notes,
                userId: user.uid,
                createdAt: new Date().toISOString()
            });

            // 2. Update Cash Account
            const accountRef = doc(firestore, `users/${user.uid}/cashAccounts`, cashAccount.id);
            batch.update(accountRef, {
                lastClosureDate: formattedToday,
                lastClosureAmount: cashAccount.balance
            });

            await batch.commit();

            toast({
                title: 'Caja Cerrada',
                description: `Se ha registrado el cierre semanal con un saldo de $${cashAccount.balance}.`,
            });
            setOpen(false);
        } catch (error) {
            console.error("Error closing cash account:", error);
            toast({
                variant: "destructive",
                title: "Error al cerrar",
                description: "No se pudo realizar el cierre.",
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2">
                        <LockKeyhole className="h-4 w-4" />
                        Cerrar Semana
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cierre Semanal de Caja</DialogTitle>
                    <DialogDescription>
                        Esta acción registrará el saldo actual como punto de control y evitará transacciones con fecha anterior a hoy.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-md">
                        <span className="text-sm text-muted-foreground">Saldo Actual en Sistema</span>
                        <span className="text-2xl font-bold font-mono">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cashAccount.balance)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas de Cierre</Label>
                        <Textarea
                            id="notes"
                            placeholder="Observaciones sobre el arqueo de caja..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                        ⚠️ Una vez cerrada la semana, no podrás agregar ni modificar movimientos anteriores a esta fecha ({format(today, 'dd/MM/yyyy')}).
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}> Cancelar </Button>
                    <Button onClick={handleClose} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cierre
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
