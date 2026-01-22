"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { employees } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";

export function AddCashAdvanceDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const isPending = false; // Mock state

  useEffect(() => {
    setDate(new Date());
    setIsClient(true);
  }, []);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [selectedEmployeeId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Adelanto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Adelanto de Sueldo</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo adelanto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employee" className="text-right">
              Empleado
            </Label>
            <Select onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee" className="col-span-3">
                <SelectValue placeholder="Seleccione un empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.status === 'Activo').map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date && isClient ? format(date, "PPP") : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto
            </Label>
            <Input id="amount" type="number" placeholder="ARS" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right pt-2">
              Motivo
            </Label>
            <Textarea id="reason" placeholder="Motivo del adelanto (opcional)" className="col-span-3" />
          </div>

          {selectedEmployee && (
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">
                Obra
                </Label>
                <Input id="project" value={selectedEmployee.projectId} disabled className="col-span-3" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Adelanto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
