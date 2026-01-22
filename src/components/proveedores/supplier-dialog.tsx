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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";
import type { Supplier } from "@/lib/types";

export function SupplierDialog({
  supplier,
  children,
}: {
  supplier?: Supplier;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!supplier;
  const isPending = false; // Mock state

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Proveedor' : 'Alta de Nuevo Proveedor'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del proveedor.' : 'Complete el formulario para registrar un nuevo proveedor. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación y Ubicación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input id="name" defaultValue={supplier?.name} placeholder="Nombre o Razón Social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input id="cuit" defaultValue={supplier?.cuit} placeholder="00-00000000-0" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" defaultValue={supplier?.address} placeholder="Dirección completa del proveedor" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="fiscalCondition">Condición Fiscal</Label>
                <Input id="fiscalCondition" defaultValue={supplier?.fiscalCondition} placeholder="Ej. Responsable Inscripto" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Persona de Contacto</Label>
                <Input id="contactPerson" defaultValue={supplier?.contactPerson} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={supplier?.email} placeholder="email@proveedor.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" defaultValue={supplier?.phone} placeholder="Código de área y número" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Clasificación</h4>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="type">Tipo de Proveedor *</Label>
                <Select defaultValue={supplier?.type}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Materiales">Materiales</SelectItem>
                    <SelectItem value="Mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Proveedor *</Label>
                <Select defaultValue={supplier?.status || "Pendiente"}>
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
          
          <div className="space-y-2">
             <Label htmlFor="notes">Notas y Observaciones</Label>
             <Textarea id="notes" defaultValue={supplier?.notes} placeholder="Cualquier información adicional sobre el proveedor..." />
          </div>

        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Proveedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
