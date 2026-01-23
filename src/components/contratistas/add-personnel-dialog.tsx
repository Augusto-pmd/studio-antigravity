"use client";

import { useState, useTransition } from "react";
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
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFirestore } from "@/firebase/provider";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ContractorEmployee } from "@/lib/types";

export function AddPersonnelDialog({
  contractorId,
  children,
}: {
  contractorId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();

  const handleSave = async () => {
    if (!firestore || !name) {
      toast({ variant: "destructive", title: "Faltan datos", description: "El nombre del empleado es obligatorio." });
      return;
    }

    startTransition(async () => {
      try {
        const personnelCollection = collection(firestore, `contractors/${contractorId}/personnel`);
        const personnelRef = doc(personnelCollection);
        const personnelId = personnelRef.id;

        const newPersonnel: Partial<ContractorEmployee> = {
          id: personnelId,
          name,
          contractorId,
        };
        
        if (artExpiryDate) {
          newPersonnel.artExpiryDate = artExpiryDate.toISOString();
        }
        
        await setDoc(personnelRef, newPersonnel, { merge: true });

        toast({
          title: "Personal Agregado",
          description: `${name} ha sido agregado al contratista.`,
        });

        setOpen(false);
        setName('');
        setArtExpiryDate(undefined);
      } catch (error: any) {
        console.error("Error saving personnel:", error);
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: error.message || "No se pudo agregar al personal.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Personal al Contratista</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo empleado para este contratista.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo del empleado" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="artExpiryDate" className="text-right">
              Vencimiento ART
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !artExpiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {artExpiryDate ? format(artExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={artExpiryDate} onSelect={setArtExpiryDate} locale={es} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Empleado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
