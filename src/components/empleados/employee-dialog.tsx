'use client';

import { useState, useEffect, useTransition, ChangeEvent } from "react";
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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [category, setCategory] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [paymentType, setPaymentType] = useState<'Diario' | 'Semanal'>('Semanal');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();

  const resetForm = () => {
    setName(employee?.name || '');
    setEmail(employee?.email || '');
    setPhone(employee?.phone || '');
    setEmergencyContactName(employee?.emergencyContactName || '');
    setEmergencyContactPhone(employee?.emergencyContactPhone || '');
    setCategory(employee?.category || '');
    setDailyWage(employee?.dailyWage?.toString() || '');
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
      const employeeRef = isEditMode && employee ? doc(employeesCollection, employee.id) : doc(employeesCollection);
      const employeeId = employeeRef.id;

      const employeeData: { [key: string]: any } = {
        id: employeeId,
        name,
        email: email || undefined,
        phone: phone || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        category,
        dailyWage: parseFloat(dailyWage) || 0,
        paymentType,
        status,
        artExpiryDate: artExpiryDate ? artExpiryDate.toISOString() : undefined,
      };

      // Clean object of undefined values before sending to Firestore
      Object.keys(employeeData).forEach(key => {
        if (employeeData[key] === undefined) {
          delete employeeData[key];
        }
      });
      
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Empleado' : 'Alta de Nuevo Empleado'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del empleado.' : 'Complete el formulario para registrar un nuevo empleado en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Nombre completo del empleado" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="email@ejemplo.com (opcional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder="(Opcional)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contacto Emergencia</Label>
            <Input id="emergencyContactName" value={emergencyContactName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmergencyContactName(e.target.value)} placeholder="Nombre (opcional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Tel. Emergencia</Label>
            <Input id="emergencyContactPhone" value={emergencyContactPhone} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmergencyContactPhone(e.target.value)} placeholder="Teléfono (opcional)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Rubro</Label>
            <Input id="category" value={category} onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)} placeholder="Ej. Albañil, Electricista" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyWage">Salario Diario</Label>
            <Input id="dailyWage" type="number" value={dailyWage} onChange={(e: ChangeEvent<HTMLInputElement>) => setDailyWage(e.target.value)} placeholder="ARS" />
          </div>
          
           <div className="space-y-2">
            <Label>Forma de Pago</Label>
             <RadioGroup value={paymentType} onValueChange={(v: any) => setPaymentType(v)} className="flex items-center gap-6 pt-1">
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

          <div className="space-y-2">
            <Label htmlFor="artExpiryDate">Vencimiento ART</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
          
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
            </Select>
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
