"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
import { Calendar as CalendarIcon, Loader2, TrendingUp, Building2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


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
  // General
  const [projectMode, setProjectMode] = useState<'CLIENT' | 'INVESTMENT'>('CLIENT');
  const [name, setName] = useState('');
  const [client, setClient] = useState(''); // "Inversionista" if Investment mode?
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

  // Investment Specific
  const [landCost, setLandCost] = useState('');
  const [totalArea, setTotalArea] = useState('');
  const [unitsCount, setUnitsCount] = useState('');
  const [projectedSalePrice, setProjectedSalePrice] = useState('');

  // Calculations
  const metrics = useMemo(() => {
    if (projectMode !== 'INVESTMENT') return null;

    const land = parseFloat(landCost) || 0;
    const construct = parseFloat(budget) || 0;
    const sale = parseFloat(projectedSalePrice) || 0;
    const area = parseFloat(totalArea) || 0;

    const totalInvestment = land + construct;
    const profit = sale - totalInvestment;
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
    const costPerM2 = area > 0 ? totalInvestment / area : 0;
    const salePerM2 = area > 0 ? sale / area : 0;

    return { totalInvestment, profit, roi, costPerM2, salePerM2 };
  }, [projectMode, landCost, budget, projectedSalePrice, totalArea]);


  const resetForm = () => {
    setProjectMode(project?.projectMode || 'CLIENT');
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
    setProgress(isEditMode ? project?.progress?.toString() || '0' : '0');

    // Investment
    setLandCost(project?.investmentData?.landCost?.toString() || '');
    setTotalArea(project?.investmentData?.totalArea?.toString() || '');
    setUnitsCount(project?.investmentData?.unitsCount?.toString() || '');
    setProjectedSalePrice(project?.investmentData?.projectedSalePrice?.toString() || '');
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

    // Validation
    if (!name || !address || !supervisor || !budget || !status || !projectType) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Por favor, complete todos los campos obligatorios (*).' });
      return;
    }

    if (projectMode === 'CLIENT' && !client) {
      toast({ variant: 'destructive', title: 'Cliente Requerido', description: 'En modo "Cliente", el campo Cliente es obligatorio.' });
      return;
    }

    if (projectMode === 'INVESTMENT') {
      if (!landCost || !totalArea || !projectedSalePrice) {
        toast({ variant: 'destructive', title: 'Datos de Inversión Incompletos', description: 'Para desarrollos propios, debe completar Costo Terreno, Área y Precio Venta.' });
        return;
      }
    }

    startTransition(() => {
      const projectsCollection = collection(firestore, 'projects');
      const projectRef = isEditMode ? doc(projectsCollection, project.id) : doc(projectsCollection);
      const projectId = projectRef.id;

      const projectData: Project = {
        id: projectId,
        projectMode,
        name,
        client: projectMode === 'INVESTMENT' ? 'Desarrollo Propio' : client,
        address,
        projectType,
        currency,
        description: description || "",
        status,
        supervisor,
        budget: parseFloat(budget) || 0,
        progress: parseInt(progress) || 0,
        balance: isEditMode && project ? project.balance : parseFloat(budget) || 0,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        investmentData: projectMode === 'INVESTMENT' ? {
          landCost: parseFloat(landCost) || 0,
          totalArea: parseFloat(totalArea) || 0,
          unitsCount: parseInt(unitsCount) || 0,
          projectedSalePrice: parseFloat(projectedSalePrice) || 0
        } : undefined
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Obra" : "Alta de Nueva Obra"}</DialogTitle>
          <DialogDescription>
            Defina el tipo de proyecto y sus características financieras.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">

          {/* Project Mode Selector */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-muted rounded-lg">
            <Button
              variant={projectMode === 'CLIENT' ? 'default' : 'ghost'}
              onClick={() => setProjectMode('CLIENT')}
              className="w-full flex gap-2"
              type="button"
            >
              <Briefcase className="w-4 h-4" />
              Obra para Cliente
            </Button>
            <Button
              variant={projectMode === 'INVESTMENT' ? 'default' : 'ghost'}
              onClick={() => {
                setProjectMode('INVESTMENT');
                setCurrency('USD'); // Force USD for investments usually
              }}
              className="w-full flex gap-2"
              type="button"
            >
              <Building2 className="w-4 h-4" />
              Desarrollo Propio
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT COLUMN: Main Data */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Datos Generales</h4>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proyecto *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Torres del Sol" />
              </div>

              {projectMode === 'CLIENT' && (
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Input id="client" value={client} onChange={e => setClient(e.target.value)} placeholder="Ej. Juan Pérez S.A." />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Input id="type" value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="Ej. Residencial" />
                </div>
                <div className="space-y-2">
                  <Label>Moneda *</Label>
                  <Select value={currency} onValueChange={(v: 'ARS' | 'USD') => setCurrency(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Peso Arg (ARS)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supervisor">Supervisor *</Label>
                  <Input id="supervisor" value={supervisor} onChange={e => setSupervisor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En Curso">En Curso</SelectItem>
                      <SelectItem value="Pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Financials & Investment */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {projectMode === 'INVESTMENT' ? <TrendingUp className="w-4 h-4" /> : null}
                {projectMode === 'INVESTMENT' ? 'Factibilidad Financiera' : 'Presupuesto y Plazos'}
              </h4>

              {/* Budget always visible */}
              <div className="space-y-2">
                <Label htmlFor="budget">
                  {projectMode === 'INVESTMENT' ? 'Costo Construcción (Estimado) *' : 'Presupuesto Total *'}
                </Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder={projectMode === 'INVESTMENT' ? "Solo obra" : "Total contrato"}
                />
              </div>

              {/* Investment Specific Fields */}
              {projectMode === 'INVESTMENT' && (
                <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Costo Terreno (USD) *</Label>
                      <Input type="number" value={landCost} onChange={e => setLandCost(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Precio Venta (Est.) *</Label>
                      <Input type="number" value={projectedSalePrice} onChange={e => setProjectedSalePrice(e.target.value)} className="h-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Área Vendible (m²) *</Label>
                      <Input type="number" value={totalArea} onChange={e => setTotalArea(e.target.value)} className="h-8" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Unidades</Label>
                      <Input type="number" value={unitsCount} onChange={e => setUnitsCount(e.target.value)} className="h-8" placeholder="Opcional" />
                    </div>
                  </div>

                  {/* LIVE METRICS */}
                  {metrics && (
                    <div className="mt-4 space-y-2 border-t pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Inversión Total:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          ${metrics.totalInvestment.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo x m²:</span>
                        <span>${Math.round(metrics.costPerM2).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ganancia Est.:</span>
                        <span className={metrics.profit >= 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                          ${metrics.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm items-center bg-white dark:bg-black p-2 rounded border">
                        <span className="font-semibold">ROI Estimado</span>
                        <span className={cn(
                          "text-lg font-bold",
                          metrics.roi >= 20 ? "text-green-600" : metrics.roi > 0 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {metrics.roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inicio</Label>
                  <Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={e => setStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
                </div>
                <div className="space-y-2">
                  <Label>Fin (Est.)</Label>
                  <Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={e => setEndDate(e.target.value ? new Date(e.target.value) : undefined)} />
                </div>
              </div>

            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Guardar Cambios" : "Crear Proyecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
