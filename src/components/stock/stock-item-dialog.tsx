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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { StockItem } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { setDoc, collection, doc } from "firebase/firestore";

const categories: StockItem['category'][] = ["Herramienta", "Consumible", "Insumo"];

export function StockItemDialog({
  item,
  children,
}: {
  item?: StockItem;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!item;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<StockItem['category'] | undefined>();
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');

  const resetForm = () => {
    setName(item?.name || '');
    setDescription(item?.description || '');
    setCategory(item?.category);
    setQuantity(item?.quantity?.toString() || (isEditMode ? '0' : ''));
    setUnit(item?.unit || '');
    setReorderPoint(item?.reorderPoint?.toString() || '');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, item]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !category || !quantity || !unit) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Nombre, categoría, cantidad y unidad son obligatorios.' });
      return;
    }

    startTransition(() => {
      const collectionRef = collection(firestore, 'stockItems');
      const docRef = isEditMode ? doc(collectionRef, item.id) : doc(collectionRef);
      
      if (!category) {
          toast({ variant: 'destructive', title: 'Error Interno', description: 'La categoría no fue seleccionada.' });
          return;
      }
      
      const itemData: Omit<StockItem, 'reorderPoint' | 'description'> & { reorderPoint?: number, description?: string } = {
        id: docRef.id,
        name,
        category,
        quantity: parseInt(quantity, 10) || 0,
        unit,
        lastUpdated: new Date().toISOString(),
      };
      
      if (description) {
        itemData.description = description;
      }
      if (reorderPoint) {
        itemData.reorderPoint = parseInt(reorderPoint, 10);
      }
      
      setDoc(docRef, itemData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Ítem Actualizado' : 'Ítem Creado',
            description: `El ítem "${name}" ha sido guardado en el stock.`,
          });
          setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el ítem. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Ítem de Stock' : 'Nuevo Ítem de Stock'}</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo ítem en el inventario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Ítem</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Taladro percutor, Caja de tornillos" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Marca, modelo, tamaño, u otra información relevante." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={(v: StockItem['category']) => setCategory(v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Input id="unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ej. unidades, cajas, mts" />
            </div>
          </div>
           <div className="space-y-2">
                <Label htmlFor="reorderPoint">Punto de Pedido (Opcional)</Label>
                <Input id="reorderPoint" type="number" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} placeholder="Cantidad mínima para reponer" />
                <p className="text-xs text-muted-foreground">
                    Cuando la cantidad baje de este número, se generará una alerta.
                </p>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Ítem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
