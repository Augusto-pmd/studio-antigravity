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
import { Loader2 } from "lucide-react";
import { useUser } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { CashAccount } from "@/lib/types";

export function EditCashAccountDialog({ children, cashAccount }: { children: React.ReactNode, cashAccount: CashAccount }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();
  
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(cashAccount.name);
    }
  }, [open, cashAccount]);

  const handleSave = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
      return;
    }
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Campo Incompleto', description: 'El nombre de la caja es obligatorio.' });
      return;
    }

    startTransition(async () => {
      try {
        const accountRef = doc(firestore, `users/${user.uid}/cashAccounts`, cashAccount.id);
        
        await updateDoc(accountRef, { name: name.trim() });
        
        toast({ title: 'Caja Actualizada', description: `La caja ha sido renombrada a "${name.trim()}".` });
        setOpen(false);
      } catch (error: any) {
        console.error("Error updating cash account:", error);
        toast({
          variant: "destructive",
          title: "Error al actualizar",
          description: error.message || "No se pudo actualizar el nombre de la caja.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Nombre de la Caja</DialogTitle>
          <DialogDescription>
            Cambia el nombre de tu caja para una mejor organización.
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
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
