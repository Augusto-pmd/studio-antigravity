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
import { Loader2 } from "lucide-react";
import { useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashAccount } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

export function AddCashAccountDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();
  
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
      return;
    }
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Campo Incompleto', description: 'El nombre de la caja es obligatorio.' });
      return;
    }

    startTransition(() => {
      const accountRef = doc(collection(firestore, `users/${user.uid}/cashAccounts`));
      
      const newAccount: CashAccount = {
          id: accountRef.id,
          userId: user.uid,
          name: name.trim(),
          currency: 'ARS',
          balance: 0,
      };

      setDoc(accountRef, newAccount, {})
        .then(() => {
          toast({ title: 'Caja Creada', description: `La caja "${name.trim()}" ha sido creada.` });
          setName('');
          setOpen(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: accountRef.path,
            operation: 'create',
            requestResourceData: newAccount,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Caja</DialogTitle>
          <DialogDescription>
            Dale un nombre a tu nueva caja de efectivo. Podrás tener hasta 3 cajas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Caja</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Caja Chica Oficina" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
