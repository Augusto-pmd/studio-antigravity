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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";
import { projects, userProfiles } from "@/lib/data";

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const isPending = false; // Mock state

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido o Alerta</DialogTitle>
          <DialogDescription>
            Asigne una tarea a un miembro del equipo. Recibirá una notificación y podrá hacer seguimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Pedido</Label>
            <Input id="title" placeholder="Ej. Solicitar seguro de accidentes personales" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Asignar a</Label>
            <Select>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Seleccione un usuario" />
              </SelectTrigger>
              <SelectContent>
                {userProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.fullName} ({profile.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Detalle aquí la tarea a realizar. Incluya toda la información necesaria para que el asignado pueda completarla."
              className="min-h-[120px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project">Relacionar con Obra (Opcional)</Label>
             <Select>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra si corresponde" />
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

        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
