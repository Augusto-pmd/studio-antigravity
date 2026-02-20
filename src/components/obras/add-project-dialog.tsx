"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, Building2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Project } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const projectSchema = z.object({
  projectMode: z.enum(["CLIENT", "INVESTMENT"]),
  name: z.string().min(1, "El nombre es obligatorio"),
  client: z.string().optional(),
  address: z.string().min(1, "La dirección es obligatoria"),
  projectType: z.string().min(1, "El tipo es obligatorio"),
  currency: z.enum(["ARS", "USD"]),
  description: z.string().optional(),
  status: z.enum(["En Curso", "Completado", "Pausado", "Cancelado"]),
  supervisor: z.string().min(1, "El supervisor es obligatorio"),
  budget: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  progress: z.coerce.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Investment fields
  landCost: z.coerce.number().optional(),
  totalArea: z.coerce.number().optional(),
  unitsCount: z.coerce.number().optional(),
  projectedSalePrice: z.coerce.number().optional()
}).superRefine((data, ctx) => {
  if (data.projectMode === "CLIENT" && (!data.client || data.client.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El cliente es obligatorio para obras de clientes.",
      path: ["client"]
    });
  }

  if (data.projectMode === "INVESTMENT") {
    if (data.landCost === undefined || data.landCost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El costo de terreno es requerido y debe ser mayor a 0",
        path: ["landCost"]
      });
    }
    if (data.totalArea === undefined || data.totalArea <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El área vendible es requerida",
        path: ["totalArea"]
      });
    }
    if (data.projectedSalePrice === undefined || data.projectedSalePrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio de venta proyectado es requerido",
        path: ["projectedSalePrice"]
      });
    }
  }
});

type ProjectFormValues = z.infer<typeof projectSchema>;

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

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectMode: "CLIENT",
      name: "",
      client: "",
      address: "",
      projectType: "",
      currency: "ARS",
      description: "",
      status: "En Curso",
      supervisor: "",
      budget: 0,
      progress: 0,
      startDate: "",
      endDate: "",
      landCost: 0,
      totalArea: 0,
      unitsCount: 0,
      projectedSalePrice: 0
    }
  });

  const projectMode = form.watch("projectMode");
  const budget = form.watch("budget");
  const landCost = form.watch("landCost");
  const totalArea = form.watch("totalArea");
  const projectedSalePrice = form.watch("projectedSalePrice");

  // Calculations
  const metrics = useMemo(() => {
    if (projectMode !== 'INVESTMENT') return null;

    const land = Number(landCost) || 0;
    const construct = Number(budget) || 0;
    const sale = Number(projectedSalePrice) || 0;
    const area = Number(totalArea) || 0;

    const totalInvestment = land + construct;
    const profit = sale - totalInvestment;
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
    const costPerM2 = area > 0 ? totalInvestment / area : 0;
    const salePerM2 = area > 0 ? sale / area : 0;

    return { totalInvestment, profit, roi, costPerM2, salePerM2 };
  }, [projectMode, landCost, budget, projectedSalePrice, totalArea]);


  useEffect(() => {
    if (open) {
      form.reset({
        projectMode: project?.projectMode || 'CLIENT',
        name: project?.name || '',
        client: project?.client || '',
        address: project?.address || '',
        projectType: project?.projectType || '',
        currency: project?.currency || 'ARS',
        description: project?.description || '',
        status: project?.status || 'En Curso',
        supervisor: project?.supervisor || '',
        budget: project?.budget || 0,
        progress: project?.progress || 0,
        startDate: project?.startDate && !isNaN(new Date(project.startDate).getTime()) ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
        endDate: project?.endDate && !isNaN(new Date(project.endDate).getTime()) ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
        landCost: project?.investmentData?.landCost || 0,
        totalArea: project?.investmentData?.totalArea || 0,
        unitsCount: project?.investmentData?.unitsCount || 0,
        projectedSalePrice: project?.investmentData?.projectedSalePrice || 0
      });
    }
  }, [open, project, form]);

  const onSubmit = (values: ProjectFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }

    startTransition(() => {
      const projectsCollection = collection(firestore, 'projects');
      const projectRef = isEditMode && project ? doc(projectsCollection, project.id) : doc(projectsCollection);
      const projectId = projectRef.id;

      const projectData: Project = {
        id: projectId,
        projectMode: values.projectMode,
        name: values.name,
        client: values.projectMode === 'INVESTMENT' ? 'Desarrollo Propio' : (values.client || ''),
        address: values.address,
        projectType: values.projectType,
        currency: values.currency,
        description: values.description || "",
        status: values.status,
        supervisor: values.supervisor,
        budget: Number(values.budget) || 0,
        progress: Number(values.progress) || 0,
        balance: isEditMode && project ? project.balance : (Number(values.budget) || 0),
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        investmentData: values.projectMode === 'INVESTMENT' ? {
          landCost: Number(values.landCost) || 0,
          totalArea: Number(values.totalArea) || 0,
          unitsCount: Number(values.unitsCount) || 0,
          projectedSalePrice: Number(values.projectedSalePrice) || 0
        } : undefined
      };

      setDoc(projectRef, projectData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Obra Actualizada' : 'Obra Creada',
            description: `La obra "${values.name}" ha sido guardada correctamente.`,
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4">
            {/* Project Mode Selector */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-muted rounded-lg">
              <Button
                variant={projectMode === 'CLIENT' ? 'default' : 'ghost'}
                onClick={() => {
                  form.setValue('projectMode', 'CLIENT');
                  form.clearErrors();
                }}
                className="w-full flex gap-2"
                type="button"
              >
                <Briefcase className="w-4 h-4" />
                Obra para Cliente
              </Button>
              <Button
                variant={projectMode === 'INVESTMENT' ? 'default' : 'ghost'}
                onClick={() => {
                  form.setValue('projectMode', 'INVESTMENT');
                  form.setValue('currency', 'USD');
                  form.clearErrors();
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

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Proyecto *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Torres del Sol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {projectMode === 'CLIENT' && (
                  <FormField
                    control={form.control}
                    name="client"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Juan Pérez S.A." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Residencial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ARS">Peso Arg (ARS)</SelectItem>
                            <SelectItem value="USD">Dólar (USD)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supervisor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supervisor *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="En Curso">En Curso</SelectItem>
                            <SelectItem value="Pausado">Pausado</SelectItem>
                            <SelectItem value="Completado">Completado</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Financials & Investment */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {projectMode === 'INVESTMENT' ? <TrendingUp className="w-4 h-4" /> : null}
                  {projectMode === 'INVESTMENT' ? 'Factibilidad Financiera' : 'Presupuesto y Plazos'}
                </h4>

                {/* Budget always visible */}
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {projectMode === 'INVESTMENT' ? 'Costo Construcción (Estimado) *' : 'Presupuesto Total *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={projectMode === 'INVESTMENT' ? "Solo obra" : "Total contrato"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Investment Specific Fields */}
                {projectMode === 'INVESTMENT' && (
                  <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="landCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Costo Terreno (USD) *</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="projectedSalePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Precio Venta (Est.) *</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="totalArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Área Vendible (m²) *</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-8" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitsCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unidades</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-8" placeholder="Opcional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inicio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin (Est.)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Guardar Cambios" : "Crear Proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
