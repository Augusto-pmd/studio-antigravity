"use client";

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
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Employee } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc } from "firebase/firestore";

export function EmployeeDialog({
  employee,
  children,
}: {
  employee?: Employee;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!employee;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [paymentType, setPaymentType] = useState<'Diario' | 'Semanal'>('Semanal');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();

  const resetForm = () => {
    setName(employee?.name || '');
    setCategory(employee?.category || '');
    setDailyWage(employee?.dailyWage.toString() || '');
    setPaymentType(employee?.paymentType || 'Semanal');
    setStatus(employee?.status || 'Activo');
    setArtExpiryDate(employee?.artExpiryDate ? parseISO(employee.artExpiryDate) : undefined);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, employee]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !category || !dailyWage) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Nombre, Rubro y Salario son obligatorios.' });
      return;
    }

    startTransition(() => {
      const employeesCollection = collection(firestore, 'employees');
      const employeeRef = isEditMode ? doc(employeesCollection, employee.id) : doc(employeesCollection);
      const employeeId = employeeRef.id;

      const employeeData: Partial<Employee> = {
        id: employeeId,
        name,
        category,
        dailyWage: parseFloat(dailyWage) || 0,
        paymentType,
        status,
      };

      if (artExpiryDate) {
        employeeData.artExpiryDate = artExpiryDate.toISOString();
      }
      
      setDoc(employeeRef, employeeData, { merge: true })
        .then(() => {
            toast({
              title: isEditMode ? 'Empleado Actualizado' : 'Empleado Creado',
              description: `El empleado "${name}" ha sido guardado correctamente.`,
            });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el empleado. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Empleado' : 'Alta de Nuevo Empleado'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del empleado.' : 'Complete el formulario para registrar un nuevo empleado en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo del empleado" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Rubro
            </Label>
            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej. Albañil, Electricista" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dailyWage" className="text-right">
              Salario Diario
            </Label>
            <Input id="dailyWage" type="number" value={dailyWage} onChange={e => setDailyWage(e.target.value)} placeholder="ARS" className="col-span-3" />
          </div>
          
           <div className="grid grid-cols-4 items-start gap-4 pt-2">
            <Label className="text-right leading-tight pt-2">Forma de Pago</Label>
             <RadioGroup value={paymentType} onValueChange={(v: any) => setPaymentType(v)} className="col-span-3 flex items-center gap-6">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Semanal" id="semanal" />
                    <Label htmlFor="semanal">Semanal</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Diario" id="diario" />
                    <Label htmlFor="diario">Diario</Label>
                </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="artExpiryDate" className="text-right">
              Vencimiento ART
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !artExpiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {artExpiryDate ? format(artExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={artExpiryDate}
                  onSelect={setArtExpiryDate}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Empleado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
