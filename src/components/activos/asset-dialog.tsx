'use client';

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Asset } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { setDoc, collection, doc } from "firebase/firestore";
import { Textarea } from "@/components/ui/textarea";

const assetCategories = ["Vehículo", "Maquinaria", "Inmueble", "Equipo Informático", "Herramientas", "Otro"];

export function AssetDialog({
  asset,
  children,
}: {
  asset?: Asset;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!asset;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [purchaseValue, setPurchaseValue] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [status, setStatus] = useState<'Activo' | 'Mantenimiento' | 'Vendido' | 'De Baja'>('Activo');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName(asset?.name || '');
    setCategory(asset?.category || '');
    setPurchaseDate(asset?.purchaseDate ? parseISO(asset.purchaseDate) : new Date());
    setPurchaseValue(asset?.purchaseValue.toString() || '');
    setCurrency(asset?.currency || 'ARS');
    setStatus(asset?.status || 'Activo');
    setDescription(asset?.description || '');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, asset]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !category || !purchaseValue || !purchaseDate) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Nombre, Categoría, Valor y Fecha de Compra son obligatorios.' });
      return;
    }

    startTransition(() => {
      const assetsCollection = collection(firestore, 'assets');
      const assetRef = isEditMode ? doc(assetsCollection, asset.id) : doc(assetsCollection);
      const assetId = assetRef.id;

      const assetData: Asset = {
        id: assetId,
        name,
        category,
        purchaseDate: purchaseDate.toISOString(),
        purchaseValue: parseFloat(purchaseValue) || 0,
        currency,
        status,
        description,
      };
      
      setDoc(assetRef, assetData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Activo Actualizado' : 'Activo Creado',
            description: `El activo "${name}" ha sido guardado correctamente.`,
          });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el activo. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Activo' : 'Registrar Nuevo Activo'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del activo.' : 'Complete el formulario para registrar un nuevo activo de la compañía.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Activo</Label>
            <Input id="name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ej. Camioneta Toyota Hilux" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={(v: string) => setCategory(v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {assetCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Patente, número de serie, u otra información relevante." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="purchaseDate">Fecha de Compra</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !purchaseDate && "text-muted-foreground")}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "PPP", { locale: es }) : <span>Seleccionar</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={purchaseDate} onSelect={setPurchaseDate} locale={es} /></PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label htmlFor="purchaseValue">Valor de Compra</Label>
                <Input id="purchaseValue" type="number" value={purchaseValue} onChange={(e: any) => setPurchaseValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          
           <div className="space-y-2">
            <Label>Moneda</Label>
             <RadioGroup value={currency} onValueChange={(v: 'ARS' | 'USD') => setCurrency(v)} className="flex items-center gap-6 pt-1">
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

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v: 'Activo' | 'Mantenimiento' | 'Vendido' | 'De Baja') => setStatus(v)}>
                <SelectTrigger id="status">
                <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Mantenimiento">En Mantenimiento</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="De Baja">De Baja</SelectItem>
                </SelectContent>
            </Select>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Activo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
