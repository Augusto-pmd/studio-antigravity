'use client';

import { useRef, useState, useEffect, useTransition } from "react";
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
import { Loader2, ScanLine, Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Supplier } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc } from "firebase/firestore";
import { extractSupplierDocData } from "@/ai/flows/extract-supplier-doc-data";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function SupplierDialog({
  supplier,
  children,
}: {
  supplier?: Supplier;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!supplier;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [cuit, setCuit] = useState('');
  const [address, setAddress] = useState('');
  const [fiscalCondition, setFiscalCondition] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'Servicios' | 'Materiales' | 'Mixto'>('Materiales');
  const [status, setStatus] = useState<'Aprobado' | 'Pendiente' | 'Rechazado'>('Pendiente');
  const [notes, setNotes] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<Date | undefined>();
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName(supplier?.name || '');
    setAlias(supplier?.alias || '');
    setCuit(supplier?.cuit || '');
    setAddress(supplier?.address || '');
    setFiscalCondition(supplier?.fiscalCondition || '');
    setContactPerson(supplier?.contactPerson || '');
    setEmail(supplier?.email || '');
    setPhone(supplier?.phone || '');
    setType(supplier?.type || 'Materiales');
    setStatus(supplier?.status || 'Pendiente');
    setNotes(supplier?.notes || '');
    setInsuranceExpiryDate(supplier?.insuranceExpiryDate ? parseISO(supplier.insuranceExpiryDate) : undefined);
    setArtExpiryDate(supplier?.artExpiryDate ? parseISO(supplier.artExpiryDate) : undefined);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, supplier]);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    toast({ title: 'Analizando documento...', description: 'Extrayendo fechas de vencimiento.' });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const imageDataUri = reader.result as string;
        const extractedData = await extractSupplierDocData(imageDataUri);

        if (extractedData.expiryDate) {
          const date = parseISO(extractedData.expiryDate);
          if (extractedData.documentType === 'ART') {
            setArtExpiryDate(date);
            toast({ title: 'ART Detectada', description: `Vencimiento: ${format(date, 'dd/MM/yyyy')}` });
          } else {
            setInsuranceExpiryDate(date);
            toast({ title: 'Seguro Detectado', description: `Vencimiento: ${format(date, 'dd/MM/yyyy')}` });
          }
        }

        if (extractedData.supplierCuit && !cuit) setCuit(extractedData.supplierCuit);
        if (extractedData.supplierName && !name) setName(extractedData.supplierName);
      };
    } catch (error) {
      console.error("Error extracting document data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron extraer datos del documento.' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !cuit || !status || !type) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Razón Social, CUIT, Estado y Tipo son obligatorios.' });
      return;
    }

    startTransition(() => {
      const suppliersCollection = collection(firestore, 'suppliers');
      const supplierRef = isEditMode && supplier ? doc(suppliersCollection, supplier.id) : doc(suppliersCollection);
      const supplierId = supplierRef.id;

      const supplierData: Supplier = {
        id: supplierId,
        name,
        alias: alias || undefined,
        cuit,
        address,
        fiscalCondition,
        contactPerson,
        email,
        phone,
        type,
        status,
        notes,
        insuranceExpiryDate: insuranceExpiryDate ? insuranceExpiryDate.toISOString().split('T')[0] : undefined,
        artExpiryDate: artExpiryDate ? artExpiryDate.toISOString().split('T')[0] : undefined,
      };

      setDoc(supplierRef, supplierData, { merge: true })
        .then(() => {
          toast({
            title: isEditMode ? 'Proveedor Actualizado' : 'Proveedor Creado',
            description: `El proveedor "${name}" ha sido guardado correctamente.`,
          });
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error writing to Firestore:", error);
          toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudo guardar el proveedor. Es posible que no tengas permisos.",
          });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Proveedor' : 'Alta de Nuevo Proveedor'}</DialogTitle>
          <DialogDescription>
            Use la IA para escanear certificados de cobertura o complete manualmente.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="mr-2 h-4 w-4" />
              )}
              Escanear Certificado de Cobertura (ART/Seguro)
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileScan}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Vencimientos de Documentación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vencimiento Seguro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !insuranceExpiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {insuranceExpiryDate ? format(insuranceExpiryDate, "PPP", { locale: es }) : <span>Sin fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={insuranceExpiryDate}
                      onSelect={setInsuranceExpiryDate}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Vencimiento ART</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !artExpiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {artExpiryDate ? format(artExpiryDate, "PPP", { locale: es }) : <span>Sin fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={artExpiryDate}
                      onSelect={setArtExpiryDate}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación y Ubicación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre o Razón Social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alias">Alias</Label>
                <Input id="alias" value={alias} onChange={e => setAlias(e.target.value)} placeholder="Ej. Corralón Fernández" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input id="cuit" value={cuit} onChange={e => setCuit(e.target.value)} placeholder="00-00000000-0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección completa del proveedor" />
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
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@proveedor.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Código de área y número" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Clasificación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Proveedor *</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Materiales">Materiales</SelectItem>
                    <SelectItem value="Mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Proveedor *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notas y Observaciones</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cualquier información adicional sobre el proveedor..." />
          </div>

        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Proveedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
