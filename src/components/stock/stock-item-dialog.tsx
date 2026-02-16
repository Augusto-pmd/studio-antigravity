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

const categories: { label: string; value: StockItem['category'] }[] = [
  { label: "Herramientas Eléctricas", value: "Power Tools" },
  { label: "Herramientas Manuales", value: "Hand Tools" },
  { label: "Seguridad", value: "Safety" },
  { label: "Consumibles", value: "Consumables" },
  { label: "Maquinaria", value: "Machinery" },
  { label: "Otros", value: "Other" },
];

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
  const [minStock, setMinStock] = useState('');

  const resetForm = () => {
    setName(item?.name || '');
    setDescription(item?.description || '');
    setCategory(item?.category);
    // Handle Quantity: Tools might not have quantity property in the same way, but StockItem alias implies it. 
    // Actually Tool extends InventoryItem but doesn't have quantity. Consumable does.
    // For Tool, quantity is implicitly 1 per item if tracked individually, or we need to check type.
    // If it's a Tool, we might hide quantity or set to 1.
    // However, the dialog seems generic. Let's cast safely.
    const qty = (item as any).quantity;
    setQuantity(qty !== undefined ? qty.toString() : (isEditMode ? '0' : ''));

    setUnit((item as any).unit || '');
    setMinStock(item?.minStock?.toString() || '');
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
    if (!name || !category) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Nombre y categoría son obligatorios.' });
      return;
    }

    startTransition(() => {
      // Decide collection based on type? Or unified?
      // Previously stockItems. Now maybe inventory_tools or inventory_consumables?
      // For now, let's Stick to 'inventory_consumables' for Consumables and 'inventory_tools' for Tools?
      // Or just 'stockItems' if we are using a unified generic view?
      // The instruction mentions "Update collection path to 'inventory_consumables'" in StockTable.
      // So we should probably write to 'inventory_consumables' if it's a consumable.

      // Heuristic: If category is 'Consumables', use inventory_consumables. Else inventory_tools?
      // Or simply allow the user to select Type?
      // For simplicity in this fix, seeing as StockTable reads from 'inventory_consumables', 
      // AND the user is likely managing consumables here:

      const targetCollection = category === 'Consumables' ? 'inventory_consumables' : 'inventory_tools';

      const collectionRef = collection(firestore, targetCollection);
      const docRef = isEditMode && item ? doc(collectionRef, item.id) : doc(collectionRef);

      const itemData: any = {
        id: docRef.id,
        name,
        category,
        minStock: parseInt(minStock, 10) || 0,
        lastUpdated: new Date().toISOString(),
        description,
        type: category === 'Consumables' ? 'CONSUMABLE' : 'TOOL',
      };

      if (category === 'Consumables') {
        itemData.quantity = parseInt(quantity, 10) || 0;
        itemData.unit = unit || 'u';
      } else {
        // Tool specific defaults
        itemData.status = (item as any)?.status || 'AVAILABLE';
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
            <Select value={category} onValueChange={(v: StockItem['category']) => setCategory(v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
            <Label htmlFor="minStock">Stock Mínimo</Label>
            <Input id="minStock" type="number" value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="Cantidad mínima para alerta" />
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
