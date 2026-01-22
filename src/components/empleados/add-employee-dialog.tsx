"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { projects } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();
  const isPending = false; // Mock state

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Empleado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Alta de Nuevo Empleado</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo empleado en el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" placeholder="Nombre completo del empleado" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Obra
            </Label>
            <Select>
              <SelectTrigger id="project" className="col-span-3">
                <SelectValue placeholder="Asignar a una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects.filter(p => p.status === 'En Curso').map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Rubro
            </Label>
            <Input id="category" placeholder="Ej. Albañil, Electricista" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dailyWage" className="text-right">
              Salario Diario
            </Label>
            <Input id="dailyWage" type="number" placeholder="ARS" className="col-span-3" />
          </div>
          
           <div className="grid grid-cols-4 items-start gap-4 pt-2">
            <Label className="text-right leading-tight pt-2">Forma de Pago</Label>
             <RadioGroup defaultValue="semanal" className="col-span-3 flex items-center gap-6">
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
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Empleado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
