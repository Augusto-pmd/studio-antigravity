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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Contract, Project } from "@/lib/types";
import { useFirestore, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function ContractDialog({
  contract,
  children,
}: {
  contract?: Contract;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!contract;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [ivaAmount, setIvaAmount] = useState('');
  const [status, setStatus] = useState<'Borrador' | 'Activo' | 'Finalizado' | 'Cancelado'>('Activo');

  const totalAmount = useMemo(() => {
    const net = parseFloat(netAmount) || 0;
    const iva = parseFloat(ivaAmount) || 0;
    return (net + iva).toFixed(2);
  }, [netAmount, ivaAmount]);

  const resetForm = () => {
    setProjectId(contract?.projectId || '');
    setDate(contract?.date ? parseISO(contract.date) : new Date());
    setDescription(contract?.description || '');
    setNetAmount(contract?.netAmount?.toString() || '');
    setIvaAmount(contract?.ivaAmount?.toString() || '');
    setStatus(contract?.status || 'Activo');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, contract]);

  const handleSave = () => {
    if (!firestore) return toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
    if (!projectId || !date || !description || !netAmount || !ivaAmount) return toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Todos los campos son obligatorios.' });

    startTransition(() => {
        const contractCollection = collection(firestore, `projects/${projectId}/contracts`);
        const contractRef = isEditMode ? doc(contractCollection, contract.id) : doc(contractCollection);
        
        const contractData: Contract = {
            id: contractRef.id,
            projectId,
            date: date.toISOString(),
            description,
            netAmount: parseFloat(netAmount) || 0,
            ivaAmount: parseFloat(ivaAmount) || 0,
            totalAmount: parseFloat(totalAmount) || 0,
            status,
        };
        
        setDoc(contractRef, contractData, { merge: true })
            .then(() => {
                toast({
                    title: isEditMode ? 'Contrato Actualizado' : 'Contrato Creado',
                    description: `El contrato ha sido guardado correctamente.`,
                });
                setOpen(false);
            })
            .catch((error) => {
                console.error("Error writing to Firestore:", error);
                toast({ variant: 'destructive', title: 'Error al guardar', description: "No se pudo guardar el contrato. Es posible que no tengas permisos." });
            });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Contrato' : 'Nuevo Contrato de Venta'}</DialogTitle>
          <DialogDescription>
            Complete la información del contrato. Los montos aquí registrados impactarán en el cálculo de IVA Débito Fiscal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setProjectId} value={projectId} disabled={isEditMode || isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha del Contrato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} locale={es} /></PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Contrato de construcción de vivienda unifamiliar." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="netAmount">Monto Neto</Label>
                <Input id="netAmount" type="number" value={netAmount} onChange={e => setNetAmount(e.target.value)} placeholder="0.00" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="ivaAmount">Monto IVA</Label>
                <Input id="ivaAmount" type="number" value={ivaAmount} onChange={e => setIvaAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          
          <div className="space-y-2 rounded-md border bg-muted p-3">
              <Label>Monto Total</Label>
              <p className="text-2xl font-bold font-mono">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(totalAmount))}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger id="status">
                <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Borrador">Borrador</SelectItem>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
            </Select>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
