"use client";

import { useState, useTransition, useEffect, ChangeEvent, useMemo, useRef } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { expenseCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, PlusCircle, TriangleAlert, Link as LinkIcon, Camera } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, doc, setDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Supplier, Expense } from "@/lib/types";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { extractInvoiceData } from "@/ai/flows/extract-invoice-data";

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

const paymentMethods = ["Transferencia", "Efectivo", "Tarjeta", "Cheque", "Mercado Pago", "Otros"];

export function AddExpenseDialog({
  expense,
  children,
}: {
  expense?: Expense;
  children?: React.ReactNode;
}) {
  const { user, permissions, firestore, firebaseApp } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const isEditMode = !!expense;
  
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [documentType, setDocumentType] = useState<'Factura' | 'Recibo Común'>('Factura');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [iva, setIva] = useState('');
  const [iibb, setIibb] = useState('');
  const [iibbJurisdiction, setIibbJurisdiction] = useState<'No Aplica' | 'CABA' | 'Provincia'>('No Aplica');
  const [exchangeRate, setExchangeRate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethodOther, setPaymentMethodOther] = useState('');

  // Retenciones
  const [retencionGanancias, setRetencionGanancias] = useState('');
  const [retencionIVA, setRetencionIVA] = useState('');
  const [retencionIIBB, setRetencionIIBB] = useState('');
  const [retencionSUSS, setRetencionSUSS] = useState('');


  // Data fetching
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const project = useMemo(() => projects?.find(p => p.id === selectedProject), [selectedProject, projects]);
  const isContractBlocked = project?.balance === 0;
  const isSupplierBlocked = false; 

  const resetForm = () => {
    setSelectedProject(expense?.projectId || '');
    setSelectedSupplier(expense?.supplierId || '');
    setSelectedCategory(expense?.categoryId || '');
    setDate(expense?.date ? parseISO(expense.date) : new Date());
    setCurrency(expense?.currency || 'ARS');
    setDocumentType(expense?.documentType || 'Factura');
    setInvoiceNumber(expense?.invoiceNumber || '');
    setFile(null);
    setAmount(expense?.amount?.toString() || '');
    setIva(expense?.iva?.toString() || '');
    setIibb(expense?.iibb?.toString() || '');
    setIibbJurisdiction(expense?.iibbJurisdiction || 'No Aplica');
    setExchangeRate(expense?.exchangeRate?.toString() || '');
    
    const pm = expense?.paymentMethod || '';
    if (paymentMethods.includes(pm)) {
        setPaymentMethod(pm);
        setPaymentMethodOther('');
    } else if (pm) {
        setPaymentMethod('Otros');
        setPaymentMethodOther(pm);
    } else {
        setPaymentMethod('');
        setPaymentMethodOther('');
    }

    setRetencionGanancias(expense?.retencionGanancias?.toString() || '');
    setRetencionIVA(expense?.retencionIVA?.toString() || '');
    setRetencionIIBB(expense?.retencionIIBB?.toString() || '');
    setRetencionSUSS(expense?.retencionSUSS?.toString() || '');
  };

  useEffect(() => {
    if (open) {
        resetForm();
    }
  }, [open, expense]);

  useEffect(() => {
    if(!open) {
      setTimeout(() => {
        resetForm();
      }, 500);
    }
  }, [open]);

  useEffect(() => {
    setIsClient(true);
    if (!expense) {
        setDate(new Date());
    }
  }, [expense]);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAiScan = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelectedForAi = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const imageDataUri = reader.result as string;
            
            try {
                const extractedData = await extractInvoiceData(imageDataUri);

                if (extractedData.amount) setAmount(extractedData.amount.toString());
                if (extractedData.iva) setIva(extractedData.iva.toString());
                if (extractedData.iibb) setIibb(extractedData.iibb.toString());
                if (extractedData.invoiceNumber) setInvoiceNumber(extractedData.invoiceNumber);
                if (extractedData.date) {
                    try {
                        setDate(parseISO(extractedData.date));
                    } catch {
                        setDate(new Date());
                        toast({ variant: 'destructive', title: 'Fecha no reconocida', description: 'No se pudo interpretar la fecha del recibo.' });
                    }
                }

                if (extractedData.supplierName) {
                    toast({
                        title: 'Datos Extraídos con IA',
                        description: `Proveedor detectado: ${extractedData.supplierName}. Por favor, verifique y seleccione el proveedor de la lista.`,
                    });
                } else {
                     toast({
                        title: 'Datos Extraídos con IA',
                        description: `Por favor, revise los campos y complete la información faltante.`,
                    });
                }
            } catch (aiError) {
                console.error(aiError);
                toast({ variant: 'destructive', title: 'Error de Extracción de IA', description: 'No se pudieron extraer los datos del recibo.' });
            } finally {
                setIsExtracting(false);
            }
        };
        reader.onerror = () => {
             toast({ variant: 'destructive', title: 'Error de Lectura', description: 'No se pudo leer el archivo de imagen.' });
             setIsExtracting(false);
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error de Archivo', description: 'Ocurrió un error al procesar el archivo.' });
        setIsExtracting(false);
    } finally {
        if(e.target) e.target.value = '';
    }
  };


  const handleSaveExpense = () => {
    if (!selectedProject || !date || !selectedSupplier || !amount || !selectedCategory || !exchangeRate || !paymentMethod) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, complete todos los campos obligatorios.' });
      return;
    }
    if (documentType === 'Factura' && !invoiceNumber) {
        toast({ variant: 'destructive', title: 'Nº de Factura requerido', description: 'El número de factura es obligatorio para documentos tipo Factura.' });
        return;
    }
    
    if (!firestore || !user || !firebaseApp) {
      toast({variant: 'destructive', title: 'Error', description: "Firebase no está disponible."});
      return;
    }

    startTransition(() => {
      setIsSaving(true);
      const saveData = async () => {
        const projectId = isEditMode ? expense.projectId : selectedProject;
        const expenseRef = isEditMode
          ? doc(firestore, 'projects', projectId, 'expenses', expense.id)
          : doc(collection(firestore, 'projects', projectId, 'expenses'));

        let receiptUrl = expense?.receiptUrl || '';
        if (file && documentType === 'Factura') {
            const storage = getStorage(firebaseApp);
            const filePath = `receipts/${projectId}/${expenseRef.id}/${file.name}`;
            const fileRef = ref(storage, filePath);
            
            await uploadBytes(fileRef, file);
            receiptUrl = await getDownloadURL(fileRef);
        }

        const expenseData: Expense = {
            id: expenseRef.id,
            projectId: projectId,
            date: date.toISOString(),
            supplierId: selectedSupplier,
            categoryId: selectedCategory,
            documentType,
            invoiceNumber: documentType === 'Factura' ? invoiceNumber : '',
            paymentMethod: paymentMethod === 'Otros' ? paymentMethodOther : paymentMethod,
            amount: parseFloat(amount),
            iva: iva ? parseFloat(iva) : 0,
            iibb: iibb ? parseFloat(iibb) : 0,
            iibbJurisdiction: documentType === 'Factura' ? iibbJurisdiction : 'No Aplica',
            currency,
            exchangeRate: parseFloat(exchangeRate),
            receiptUrl,
            retencionGanancias: retencionGanancias ? parseFloat(retencionGanancias) : 0,
            retencionIVA: retencionIVA ? parseFloat(retencionIVA) : 0,
            retencionIIBB: retencionIIBB ? parseFloat(retencionIIBB) : 0,
            retencionSUSS: retencionSUSS ? parseFloat(retencionSUSS) : 0,
        };

        return setDoc(expenseRef, expenseData, { merge: true });
      };

      saveData()
        .then(() => {
            toast({ title: isEditMode ? 'Gasto Actualizado' : 'Gasto Guardado', description: 'El gasto ha sido guardado correctamente.' });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo registrar el gasto. Es posible que no tengas permisos.' });
        })
        .finally(() => {
            setIsSaving(false);
        });
    });
  };

  const isSubmitDisabled = isPending || isSaving || isContractBlocked || isSupplierBlocked || !selectedProject || !selectedSupplier || !selectedCategory || !amount || !exchangeRate || (documentType === 'Factura' && !invoiceNumber);
  
  if (!permissions.canLoadExpenses) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Cargar Gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Gasto' : 'Cargar Nuevo Gasto'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique los detalles del gasto.' : 'Complete los campos para registrar un nuevo gasto en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-4">
          <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelectedForAi} accept="image/*" />
          <div className="flex justify-center">
              <Button variant="outline" onClick={handleAiScan} disabled={isExtracting || isSaving}>
                  {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  Escanear Recibo con IA
              </Button>
          </div>
          <Separator />
          {isContractBlocked && (
            <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Contrato Bloqueado</AlertTitle>
              <AlertDescription>
                Esta obra tiene saldo cero y no admite más gastos.
              </AlertDescription>
            </Alert>
          )}
          {isSupplierBlocked && (
             <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Proveedor Bloqueado</AlertTitle>
              <AlertDescription>
                El seguro o ART de este proveedor está vencido. No se pueden cargar gastos.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setSelectedProject} value={selectedProject} disabled={isEditMode || isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date && isClient ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier">Proveedor</Label>
            <Select onValueChange={setSelectedSupplier} value={selectedSupplier} disabled={isLoadingSuppliers}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Seleccione un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="category">Rubro</Label>
            <Select onValueChange={setSelectedCategory} value={selectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione un rubro" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label>Tipo Comprobante</Label>
             <RadioGroup
              value={documentType}
              onValueChange={(value: 'Factura' | 'Recibo Común') => setDocumentType(value)}
              className="flex items-center gap-6 pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Factura" id="factura" />
                <Label htmlFor="factura">Factura</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Recibo Común" id="recibo" />
                <Label htmlFor="recibo">Recibo Común</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Medio de Pago</Label>
            <Select onValueChange={(value) => setPaymentMethod(value)} value={paymentMethod}>
                <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Seleccione un medio" />
                </SelectTrigger>
                <SelectContent>
                    {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                            {method}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'Otros' && (
              <div className="space-y-2">
                  <Label htmlFor="paymentMethodOther">Especificar Medio de Pago</Label>
                  <Input
                      id="paymentMethodOther"
                      value={paymentMethodOther}
                      onChange={(e) => setPaymentMethodOther(e.target.value)}
                      placeholder="Especifique el medio de pago"
                  />
              </div>
          )}

          {documentType === 'Factura' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="receipt">Comprobante</Label>
                <div className="flex items-center gap-2">
                  <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic"/>
                   {isEditMode && expense?.receiptUrl && (
                    <Button asChild variant="outline" size="icon">
                        <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Nº Factura</Label>
                <div className="relative">
                    <Input id="invoiceNumber" type="text" placeholder="Nº de la factura" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup
              value={currency}
              onValueChange={(value: 'ARS' | 'USD') => setCurrency(value)}
              className="flex items-center gap-6 pt-1"
            >
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
            <Label htmlFor="exchangeRate">Tipo de Cambio</Label>
            <Input
              id="exchangeRate"
              type="number"
              placeholder="Dólar BNA compra"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </div>
          
          {documentType === 'Factura' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Impuestos y Percepciones</h4>
                <div className="space-y-2">
                  <Label htmlFor="iva">IVA</Label>
                  <div className="relative">
                      <Input id="iva" type="number" placeholder="IVA del gasto" value={iva} onChange={(e) => setIva(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iibb">Percepción IIBB</Label>
                  <div className="relative">
                      <Input id="iibb" type="number" placeholder="Percepción IIBB" value={iibb} onChange={(e) => setIibb(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Jurisdicción IIBB</Label>
                  <RadioGroup 
                      value={iibbJurisdiction} 
                      onValueChange={(v) => setIibbJurisdiction(v as any)} 
                      className="flex items-center gap-6 pt-2"
                  >
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No Aplica" id="iibb-na" />
                          <Label htmlFor="iibb-na">No Aplica</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="CABA" id="iibb-caba" />
                          <Label htmlFor="iibb-caba">CABA</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Provincia" id="iibb-pba" />
                          <Label htmlFor="iibb-pba">Provincia</Label>
                      </div>
                  </RadioGroup>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Retenciones Aplicadas al Pago</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retencionGanancias">Ret. Ganancias</Label>
                <Input id="retencionGanancias" type="number" placeholder="0.00" value={retencionGanancias} onChange={e => setRetencionGanancias(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retencionIVA">Ret. IVA</Label>
                <Input id="retencionIVA" type="number" placeholder="0.00" value={retencionIVA} onChange={e => setRetencionIVA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retencionIIBB">Ret. IIBB</Label>
                <Input id="retencionIIBB" type="number" placeholder="0.00" value={retencionIIBB} onChange={e => setRetencionIIBB(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="retencionSUSS">Ret. SUSS</Label>
                <Input id="retencionSUSS" type="number" placeholder="0.00" value={retencionSUSS} onChange={e => setRetencionSUSS(e.target.value)} />
              </div>
            </div>
          </div>
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-lg">Monto Total</Label>
             <div className="relative">
                <Input id="amount" type="number" placeholder="0.00" className="text-lg h-12" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveExpense} disabled={isSubmitDisabled}>
            {(isPending || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Gasto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
