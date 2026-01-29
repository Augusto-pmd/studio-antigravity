'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Sale, Project } from '@/lib/types';
import { useFirestore, useCollection, useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  doc,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

const projectConverter = {
  toFirestore: (data: Project): DocumentData => data,
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project),
};

export function SaleDialog({
  sale,
  children,
}: {
  sale?: Sale;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!sale;
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const projectsQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'projects').withConverter(projectConverter)
        : null,
    [firestore]
  );
  const { data: projects, isLoading: isLoadingProjects } =
    useCollection<Project>(projectsQuery);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [documentType, setDocumentType] = useState<
    'Factura de Venta' | 'Nota de Crédito'
  >('Factura de Venta');
  const [description, setDescription] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [ivaAmount, setIvaAmount] = useState('');
  const [status, setStatus] = useState<
    'Borrador' | 'Pendiente de Cobro' | 'Cobrado' | 'Cancelado'
  >('Pendiente de Cobro');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const totalAmount = useMemo(() => {
    const net = parseFloat(netAmount) || 0;
    const iva = parseFloat(ivaAmount) || 0;
    return (net + iva).toFixed(2);
  }, [netAmount, ivaAmount]);

  const resetForm = () => {
    setProjectId(sale?.projectId || '');
    setDate(sale?.date ? parseISO(sale.date) : new Date());
    setDocumentType(sale?.documentType || 'Factura de Venta');
    setDescription(sale?.description || '');
    setNetAmount(sale?.netAmount?.toString() || '');
    setIvaAmount(sale?.ivaAmount?.toString() || '');
    setStatus(sale?.status || 'Pendiente de Cobro');
    setInvoiceFile(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, sale]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!firestore || !firebaseApp) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo conectar a la base de datos.',
      });
      return;
    }
    if (!projectId || !date || !description || !netAmount || !ivaAmount) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Todos los campos son obligatorios.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const saleCollection = collection(firestore, `projects/${projectId}/sales`);
      const saleRef =
        isEditMode && sale
          ? doc(saleCollection, sale.id)
          : doc(saleCollection);

      let invoiceUrl = sale?.invoiceUrl || '';
      if (invoiceFile) {
        const storage = getStorage(firebaseApp);
        const filePath = `sales_invoices/${projectId}/${saleRef.id}/${invoiceFile.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, invoiceFile);
        invoiceUrl = await getDownloadURL(fileRef);
      }

      const saleData: Sale = {
        id: saleRef.id,
        projectId,
        date: date.toISOString(),
        description,
        documentType,
        netAmount: parseFloat(netAmount) || 0,
        ivaAmount: parseFloat(ivaAmount) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        status,
        invoiceUrl: invoiceUrl || undefined,
        collectedDate: sale?.collectedDate,
        treasuryAccountId: sale?.treasuryAccountId,
        retencionGanancias: sale?.retencionGanancias,
        retencionIVA: sale?.retencionIVA,
        retencionIIBB: sale?.retencionIIBB,
      };

      // Remove undefined properties before sending to Firestore
      const cleanData = Object.fromEntries(
        Object.entries(saleData).filter(([, v]) => v !== undefined)
      );

      await setDoc(saleRef, cleanData, { merge: true });

      toast({
        title: isEditMode ? 'Documento Actualizado' : 'Documento Registrado',
        description: `El documento de venta ha sido guardado correctamente.`,
      });
      setOpen(false);
    } catch (error) {
      console.error('Error writing to Firestore:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description:
          'No se pudo guardar el documento. Por favor, revise los datos e inténtelo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? 'Editar Documento de Venta'
              : 'Registrar Nuevo Documento de Venta'}
          </DialogTitle>
          <DialogDescription>
            Complete la información del documento. Los montos aquí registrados
            impactarán en el cálculo de IVA Débito Fiscal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select
              onValueChange={setProjectId}
              value={projectId}
              disabled={isEditMode || isLoadingProjects}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p: Project) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha del Documento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, 'PPP', { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <RadioGroup
              value={documentType}
              onValueChange={(v: 'Factura de Venta' | 'Nota de Crédito') =>
                setDocumentType(v)
              }
              className="flex pt-1 gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Factura de Venta" id="factura-venta" />
                <Label htmlFor="factura-venta">Factura de Venta</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="Nota de Crédito"
                  id="nota-credito-venta"
                />
                <Label htmlFor="nota-credito-venta">Nota de Crédito</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Factura por avance de obra..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceFile">Adjuntar Comprobante</Label>
            <div className="flex items-center gap-2">
              <Input
                id="invoiceFile"
                type="file"
                onChange={handleFileChange}
                className="flex-1"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {isEditMode && sale?.invoiceUrl && (
                <Button asChild variant="outline" size="icon">
                  <a
                    href={sale.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="netAmount">Monto Neto</Label>
              <Input
                id="netAmount"
                type="number"
                value={netAmount}
                onChange={(e) => setNetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ivaAmount">Monto IVA</Label>
              <Input
                id="ivaAmount"
                type="number"
                value={ivaAmount}
                onChange={(e) => setIvaAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted p-3">
            <Label>Monto Total</Label>
            <p className="text-2xl font-bold font-mono">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
              }).format(parseFloat(totalAmount))}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={status}
              onValueChange={(
                v: 'Borrador' | 'Pendiente de Cobro' | 'Cobrado' | 'Cancelado'
              ) => setStatus(v)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Borrador">Borrador</SelectItem>
                <SelectItem value="Pendiente de Cobro">
                  Pendiente de Cobro
                </SelectItem>
                <SelectItem value="Cobrado">Cobrado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
