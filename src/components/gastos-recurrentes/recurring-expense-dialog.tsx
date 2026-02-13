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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { RecurringExpense } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { setDoc, collection, doc } from "firebase/firestore";
import { expenseCategories } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";

const periods = ["Diario", "Semanal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"];

export function RecurringExpenseDialog({
  expense,
  children,
}: {
  expense?: RecurringExpense;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!expense;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [period, setPeriod] = useState<RecurringExpense['period']>('Mensual');
  const [paymentSource, setPaymentSource] = useState<'Tesorería' | 'Caja Chica'>('Tesorería');
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<'Activo' | 'Pausado'>('Activo');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setDescription(expense?.description || '');
    setCategory(expense?.category || '');
    setAmount(expense?.amount?.toString() || '');
    setCurrency(expense?.currency || 'ARS');
    setPeriod(expense?.period || 'Mensual');
    setPaymentSource(expense?.paymentSource || 'Tesorería');
    setIssueDate(expense?.issueDate ? parseISO(expense.issueDate) : undefined);
    setNextDueDate(expense?.nextDueDate ? parseISO(expense.nextDueDate) : undefined);
    setStatus(expense?.status || 'Activo');
    setNotes(expense?.notes || '');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, expense]);

  const handleSave = () => {
    if (!firestore) return;
    if (!description || !category || !amount || !period || !nextDueDate || !isValid(nextDueDate)) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Descripción, Categoría, Monto, Período y Próximo Vencimiento son obligatorios, y la fecha debe ser válida.' });
      return;
    }

    startTransition(() => {
      const collectionRef = collection(firestore, 'recurringExpenses');
      const docRef = isEditMode && expense ? doc(collectionRef, expense.id) : doc(collectionRef);
      
      const expenseData: RecurringExpense = {
        id: docRef.id,
        description,
        category,
        amount: parseFloat(amount),
        currency,
        period,
        paymentSource,
        nextDueDate: format(nextDueDate, 'yyyy-MM-dd'),
        status,
        issueDate: issueDate && isValid(issueDate) ? format(issueDate, 'yyyy-MM-dd') : undefined,
        notes: notes || undefined,
      };
      
      setDoc(docRef, expenseData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Gasto Actualizado' : 'Gasto Creado',
            description: `El gasto recurrente "${description}" ha sido guardado.`,
          });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el gasto. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Gasto Recurrente' : 'Nuevo Gasto Recurrente'}</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo gasto fijo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Ej. Alquiler Oficina, Monotributo" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
                <Label>Moneda</Label>
                <RadioGroup value={currency} onValueChange={(v: any) => setCurrency(v)} className="flex items-center gap-6 pt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="ARS" id="ars" /><Label htmlFor="ars">ARS</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="USD" id="usd" /><Label htmlFor="usd">USD</Label></div>
                </RadioGroup>
            </div>
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="paymentSource">Vía Contable / Origen del Pago</Label>
            <Select value={paymentSource} onValueChange={(v: any) => setPaymentSource(v)}>
              <SelectTrigger id="paymentSource">
                <SelectValue placeholder="Seleccione una vía contable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tesorería">Tesorería (Formal / "Blanco")</SelectItem>
                <SelectItem value="Caja Chica">Caja Chica (Informal / "Negro")</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger id="period">
                    <SelectValue placeholder="Seleccione período" />
                </SelectTrigger>
                <SelectContent>
                    {periods.map((p: any) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="issueDate">Fecha de Emisión (Opcional)</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !issueDate && "text-muted-foreground")}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP", { locale: es }) : <span>Seleccionar</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={issueDate} onSelect={setIssueDate} locale={es} /></PopoverContent>
                </Popover>
            </div>
          </div>
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
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                </SelectContent>
            </Select>
          </div>
          
           <div className="space-y-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Añada cualquier detalle relevante..." />
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Gasto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}