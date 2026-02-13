'use client';

import { useState, useEffect, useTransition } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Moratoria } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { setDoc, collection, doc } from "firebase/firestore";

export function PlanDePagoDialog({
  plan,
  children,
}: {
  plan?: Moratoria;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!plan;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [tax, setTax] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<Moratoria['status']>('Activa');

  const resetForm = () => {
    setName(plan?.name || '');
    setTax(plan?.tax || '');
    setTotalAmount(plan?.totalAmount?.toString() || '');
    setInstallments(plan?.installments?.toString() || '');
    setInstallmentAmount(plan?.installmentAmount?.toString() || '');
    setNextDueDate(plan?.nextDueDate ? parseISO(plan.nextDueDate) : undefined);
    setStatus(plan?.status || 'Activa');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, plan]);

  const handleSave = () => {
    if (!firestore) return;
    if (!name || !tax || !totalAmount || !installments || !installmentAmount || !nextDueDate) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Todos los campos son obligatorios.' });
      return;
    }

    startTransition(() => {
      const collectionRef = collection(firestore, 'moratorias');
      const docRef = isEditMode && plan ? doc(collectionRef, plan.id) : doc(collectionRef);
      
      const planData: Moratoria = {
        id: docRef.id,
        name,
        tax,
        totalAmount: parseFloat(totalAmount),
        installments: parseInt(installments),
        installmentAmount: parseFloat(installmentAmount),
        nextDueDate: format(nextDueDate, 'yyyy-MM-dd'),
        status,
        paidAmount: plan?.paidAmount || 0,
        paidInstallments: plan?.paidInstallments || 0,
      };
      
      setDoc(docRef, planData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Plan Actualizado' : 'Plan Creado',
            description: `El plan de pagos "${name}" ha sido guardado.`,
          });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el plan. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Plan de Pago' : 'Nuevo Plan de Pago'}</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar una nueva moratoria o plan de facilidades.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Plan</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Plan Facilidades IVA" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax">Impuesto</Label>
            <Input id="tax" value={tax} onChange={e => setTax(e.target.value)} placeholder="Ej. IVA, Ganancias, SUSS" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="totalAmount">Monto Total Deuda</Label>
                <Input id="totalAmount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="installments">Total de Cuotas</Label>
                <Input id="installments" type="number" value={installments} onChange={e => setInstallments(e.target.value)} placeholder="Ej. 12" />
            </div>
          </div>
           <div className="space-y-2">
                <Label htmlFor="installmentAmount">Monto de la Cuota</Label>
                <Input id="installmentAmount" type="number" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} placeholder="0.00" />
            </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="nextDueDate">Próximo Vencimiento</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !nextDueDate && "text-muted-foreground")}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextDueDate ? format(nextDueDate, "PPP", { locale: es }) : <span>Seleccionar</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={nextDueDate} onSelect={setNextDueDate} locale={es} /></PopoverContent>
                </Popover>
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={status} onValueChange={(v: Moratoria['status']) => setStatus(v)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Activa">Activa</SelectItem>
                        <SelectItem value="Finalizada">Finalizada</SelectItem>
                        <SelectItem value="Incumplida">Incumplida</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
