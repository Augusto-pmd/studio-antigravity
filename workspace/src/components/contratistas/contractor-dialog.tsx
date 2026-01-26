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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import type { Contractor } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc } from "firebase/firestore";

export function ContractorDialog({
  contractor,
  children,
}: {
  contractor?: Contractor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!contractor;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [cuit, setCuit] = useState('');
  const [address, setAddress] = useState('');
  const [fiscalCondition, setFiscalCondition] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Aprobado' | 'Pendiente' | 'Rechazado'>('Pendiente');
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName(contractor?.name || '');
    setCuit(contractor?.cuit || '');
    setAddress(contractor?.address || '');
    setFiscalCondition(contractor?.fiscalCondition || '');
    setContactPerson(contractor?.contactPerson || '');
    setEmail(contractor?.email || '');
    setPhone(contractor?.phone || '');
    setStatus(contractor?.status || 'Pendiente');
    setArtExpiryDate(contractor?.artExpiryDate ? parseISO(contractor.artExpiryDate) : undefined);
    setInsuranceExpiryDate(contractor?.insuranceExpiryDate ? parseISO(contractor.insuranceExpiryDate) : undefined);
    setNotes(contractor?.notes || '');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, contractor]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !cuit || !status) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Razón Social, CUIT y Estado son obligatorios.' });
      return;
    }

    startTransition(() => {
        const contractorsCollection = collection(firestore, 'contractors');
        const contractorRef = isEditMode ? doc(contractorsCollection, contractor.id) : doc(contractorsCollection);
        const contractorId = contractorRef.id;

        const contractorData: Partial<Contractor> = {
            id: contractorId,
            name,
            cuit,
            address,
            fiscalCondition,
            contactPerson,
            email,
            phone,
            status,
            notes,
        };

        if (artExpiryDate) {
            contractorData.artExpiryDate = artExpiryDate.toISOString();
        }
        if (insuranceExpiryDate) {
            contractorData.insuranceExpiryDate = insuranceExpiryDate.toISOString();
        }
        
        setDoc(contractorRef, contractorData, { merge: true })
            .then(() => {
                toast({
                    title: isEditMode ? 'Contratista Actualizado' : 'Contratista Creado',
                    description: `El contratista "${name}" ha sido guardado correctamente.`,
                });
                setOpen(false);
            })
            .catch((error) => {
                console.error("Error writing to Firestore:", error);
                toast({ variant: 'destructive', title: 'Error al guardar', description: "No se pudo guardar el contratista. Es posible que no tengas permisos." });
            });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Contratista' : 'Alta de Nuevo Contratista'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del contratista.' : 'Complete el formulario para registrar un nuevo contratista. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación y Ubicación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre o Razón Social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input id="cuit" value={cuit} onChange={e => setCuit(e.target.value)} placeholder="00-00000000-0" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección completa del contratista" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="fiscalCondition">Condición Fiscal</Label>
                <Input id="fiscalCondition" value={fiscalCondition} onChange={e => setFiscalCondition(e.target.value)} placeholder="Ej. Responsable Inscripto" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Persona de Contacto</Label>
                <Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contratista.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Código de área y número" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Estado</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Contratista *</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente de Aprobación</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Documentación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artExpiryDate">Vencimiento ART</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !artExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {artExpiryDate ? format(artExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={artExpiryDate} onSelect={setArtExpiryDate} locale={es} /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiryDate">Vencimiento Seguro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !insuranceExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {insuranceExpiryDate ? format(insuranceExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={insuranceExpiryDate} onSelect={setInsuranceExpiryDate} locale={es} /></PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
             <Label htmlFor="notes">Notas y Observaciones</Label>
             <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cualquier información adicional sobre el contratista..." />
          </div>

        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Contratista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
