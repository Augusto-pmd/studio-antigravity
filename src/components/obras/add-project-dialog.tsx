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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";


export function AddProjectDialog({
  project,
  children,
}: {
  project?: Project;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!project;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'En Curso' | 'Completado' | 'Pausado' | 'Cancelado'>('En Curso');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [supervisor, setSupervisor] = useState('');
  const [budget, setBudget] = useState('');
  const [progress, setProgress] = useState('');

  const resetForm = () => {
    setName(project?.name || '');
    setClient(project?.client || '');
    setAddress(project?.address || '');
    setProjectType(project?.projectType || '');
    setCurrency(project?.currency || 'ARS');
    setDescription(project?.description || '');
    setStatus(project?.status || 'En Curso');
    setStartDate(project?.startDate ? new Date(project.startDate) : undefined);
    setEndDate(project?.endDate ? new Date(project.endDate) : undefined);
    setSupervisor(project?.supervisor || '');
    setBudget(project?.budget?.toString() || '');
    // For new projects, progress and balance start at 0.
    setProgress(isEditMode ? project?.progress?.toString() || '0' : '0');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, project]);
  
  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !client || !address || !supervisor || !budget || !status || !projectType) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Por favor, complete todos los campos obligatorios (*).' });
        return;
    }
    
    startTransition(() => {
      const projectsCollection = collection(firestore, 'projects');
      const projectRef = isEditMode ? doc(projectsCollection, project.id) : doc(projectsCollection);
      const projectId = projectRef.id;

      const projectData: Project = {
          id: projectId,
          name,
          client,
          address,
          projectType,
          currency,
          description: description || undefined,
          status,
          supervisor,
          budget: parseFloat(budget) || 0,
          progress: parseInt(progress) || 0,
          balance: isEditMode && project ? project.balance : parseFloat(budget) || 0,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
      };

      setDoc(projectRef, projectData, { merge: true })
        .then(() => {
            toast({
                title: isEditMode ? 'Obra Actualizada' : 'Obra Creada',
                description: `La obra "${name}" ha sido guardada correctamente.`,
            });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: 'destructive',
                title: 'Error al Guardar',
                description: 'No se pudo guardar la obra. Es posible que no tengas permisos.'
            });
        });
    });
  };

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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Edificio Corporativo Central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Input
                  id="client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Ej. Tech Solutions S.A."
                />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descripción del proyecto..."
                />
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección completa de la obra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Tipo de obra *</Label>
                <Input
                  id="projectType"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  placeholder="Ej. Comercial, Residencial"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda *</Label>
                <RadioGroup
                  value={currency}
                  onValueChange={(v: 'ARS' | 'USD') => setCurrency(v)}
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
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
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
                <Label htmlFor="startDate">Fecha de inicio</Label>
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
                      {startDate ? format(startDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={es} initialFocus />
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
                      {endDate ? format(endDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={es} initialFocus />
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
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Nombre del supervisor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto asignado *</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Monto total del presupuesto"
                />
              </div>
                <div className="space-y-2">
                    <Label htmlFor="progress">Progreso (%)</Label>
                    <Input
                        id="progress"
                        type="number"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(e) => setProgress(e.target.value)}
                        placeholder="0-100"
                    />
                </div>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Guardar Cambios" : "Guardar Obra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
