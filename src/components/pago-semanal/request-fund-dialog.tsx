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

const fundRequestCategories = [
    { id: 'logistica', name: 'Logística y PMD' },
    { id: 'materiales', name: 'Materiales' },
    { id: 'viaticos', name: 'Viáticos' },
    { id: 'caja-chica', name: 'Caja Chica' },
    { id: 'otros', name: 'Otros' },
];


export function RequestFundDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [isClient, setIsClient] = useState(false);
  const isPending = false; // Mock state

  useEffect(() => {
    setIsClient(true);
    setDate(new Date());
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Solicitar Dinero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Solicitar Fondos</DialogTitle>
          <DialogDescription>
            Complete el formulario para crear una nueva solicitud de fondos para la planilla semanal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                Categoría
                </Label>
                <Select>
                <SelectTrigger id="category" className="col-span-3">
                    <SelectValue placeholder="Seleccione una categoría" />
                </SelectTrigger>
                <SelectContent>
                    {fundRequestCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                        {c.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">
                Obra
                </Label>
                <Select>
                <SelectTrigger id="project" className="col-span-3">
                    <SelectValue placeholder="Imputar a una obra (opcional)" />
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
                <Label className="text-right">Moneda</Label>
                <RadioGroup 
                    value={currency}
                    onValueChange={(value) => setCurrency(value as 'ARS' | 'USD')}
                    className="col-span-3 flex items-center gap-6"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ARS" id="ars" />
                        <Label htmlFor="ars">ARS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="USD" id="usd" />
                        <Label htmlFor="usd">USD</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                Monto
                </Label>
                <Input id="amount" type="number" placeholder="0.00" className="col-span-3" />
            </div>

            {currency === 'USD' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="exchangeRate" className="text-right">
                    Tipo de Cambio
                    </Label>
                    <Input
                    id="exchangeRate"
                    type="number"
                    placeholder="Dólar BNA compra"
                    className="col-span-3"
                    />
                </div>
            )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
