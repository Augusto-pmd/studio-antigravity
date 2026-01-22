"use client";

import { useState, useEffect } from "react";
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
import type { Employee } from "@/lib/types";

export function EmployeeDialog({
  employee,
  children,
}: {
  employee?: Employee;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!employee;
  const isPending = false; // Mock state

  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();

  useEffect(() => {
    if(open) {
      setArtExpiryDate(employee?.artExpiryDate ? parseISO(employee.artExpiryDate) : undefined);
    }
  }, [open, employee]);


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
            <Input id="name" defaultValue={employee?.name} placeholder="Nombre completo del empleado" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Rubro
            </Label>
            <Input id="category" defaultValue={employee?.category} placeholder="Ej. Albañil, Electricista" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dailyWage" className="text-right">
              Salario Diario
            </Label>
            <Input id="dailyWage" type="number" defaultValue={employee?.dailyWage} placeholder="ARS" className="col-span-3" />
          </div>
          
           <div className="grid grid-cols-4 items-start gap-4 pt-2">
            <Label className="text-right leading-tight pt-2">Forma de Pago</Label>
             <RadioGroup defaultValue={employee?.paymentType || "semanal"} className="col-span-3 flex items-center gap-6">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="semanal" id="semanal" />
                    <Label htmlFor="semanal">Semanal</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="diario" id="diario" />
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
                  {artExpiryDate ? format(artExpiryDate, "PPP") : <span>Opcional</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={artExpiryDate}
                  onSelect={setArtExpiryDate}
                />
              </PopoverContent>
            </Popover>
          </div>

        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Empleado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
