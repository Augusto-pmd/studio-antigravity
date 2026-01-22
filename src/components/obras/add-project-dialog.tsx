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
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Separator } from "../ui/separator";
import type { Project } from "@/lib/types";

export function AddProjectDialog({
  project,
  children,
}: {
  project?: Project;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!project;
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const isPending = false; // Mock state

  useEffect(() => {
    if (open) {
      setStartDate(project?.startDate ? parseISO(project.startDate) : undefined);
      setEndDate(project?.endDate ? parseISO(project.endDate) : undefined);
    }
  }, [open, project]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Obra" : "Alta de Nueva Obra"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifique la información de la obra."
              : "Complete el formulario para registrar una nueva obra en el sistema. Los campos marcados con * son obligatorios."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">
          {/* Identificación */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la obra *</Label>
                <Input
                  id="name"
                  defaultValue={project?.name}
                  placeholder="Ej. Edificio Corporativo Central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Input
                  id="client"
                  defaultValue={project?.client}
                  placeholder="Ej. Tech Solutions S.A."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Ubicación y Características */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Ubicación y Características</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  defaultValue={project?.address}
                  placeholder="Dirección completa de la obra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Tipo de obra</Label>
                <Input
                  id="projectType"
                  defaultValue={project?.projectType}
                  placeholder="Ej. Comercial, Residencial"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda *</Label>
                <RadioGroup
                  defaultValue={project?.currency || "ARS"}
                  className="flex items-center gap-6 pt-2"
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
            </div>
          </div>

          <Separator />

          {/* Estado y Plazos */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Estado y Plazos</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado de la obra *</Label>
                <Select defaultValue={project?.status || "En Curso"}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En Curso">En Curso</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Seleccione una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha estimada de finalización</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Seleccione una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Gestión y Control */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Gestión y Control</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supervisor">Responsable de la obra *</Label>
                <Input
                  id="supervisor"
                  defaultValue={project?.supervisor}
                  placeholder="Nombre del supervisor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto asignado *</Label>
                <Input
                  id="budget"
                  type="number"
                  defaultValue={project?.budget}
                  placeholder="Monto total del presupuesto"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Guardar Cambios" : "Guardar Obra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
