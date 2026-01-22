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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Separator } from "../ui/separator";
import type { Contractor } from "@/lib/types";

export function ContractorDialog({
  contractor,
  children,
}: {
  contractor?: Contractor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!contractor;
  const isPending = false; // Mock state

  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setArtExpiryDate(contractor?.artExpiryDate ? parseISO(contractor.artExpiryDate) : undefined);
      setInsuranceExpiryDate(contractor?.insuranceExpiryDate ? parseISO(contractor.insuranceExpiryDate) : undefined);
    }
  }, [open, contractor]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Contratista' : 'Alta de Nuevo Contratista'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del contratista.' : 'Complete el formulario para registrar un nuevo contratista. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación y Ubicación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input id="name" defaultValue={contractor?.name} placeholder="Nombre o Razón Social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input id="cuit" defaultValue={contractor?.cuit} placeholder="00-00000000-0" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" defaultValue={contractor?.address} placeholder="Dirección completa del contratista" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="fiscalCondition">Condición Fiscal</Label>
                <Input id="fiscalCondition" defaultValue={contractor?.fiscalCondition} placeholder="Ej. Responsable Inscripto" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Persona de Contacto</Label>
                <Input id="contactPerson" defaultValue={contractor?.contactPerson} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={contractor?.email} placeholder="email@contratista.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" defaultValue={contractor?.phone} placeholder="Código de área y número" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Estado</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Contratista *</Label>
                <Select defaultValue={contractor?.status || "Pendiente"}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente de Aprobación</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Documentación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artExpiryDate">Vencimiento ART</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !artExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {artExpiryDate ? format(artExpiryDate, "PPP") : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={artExpiryDate} onSelect={setArtExpiryDate} /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiryDate">Vencimiento Seguro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !insuranceExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {insuranceExpiryDate ? format(insuranceExpiryDate, "PPP") : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={insuranceExpiryDate} onSelect={setInsuranceExpiryDate} /></PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
             <Label htmlFor="notes">Notas y Observaciones</Label>
             <Textarea id="notes" defaultValue={contractor?.notes} placeholder="Cualquier información adicional sobre el contratista..." />
          </div>

        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Contratista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
