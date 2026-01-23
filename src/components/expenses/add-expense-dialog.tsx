"use client";

import { useState, useTransition, useEffect, ChangeEvent, useMemo } from "react";
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
import { projects, suppliers as mockSuppliers, expenseCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Wand2, Loader2, PlusCircle, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { extractInvoiceDataAction } from "@/lib/actions";
import { useUser } from "@/context/user-context";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { Project, Supplier, Expense } from "@/lib/types";
import { Separator } from "../ui/separator";

export function AddExpenseDialog() {
  const { user, permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  
  const [isClient, setIsClient] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentMethodOther, setPaymentMethodOther] = useState('');

  // Retenciones
  const [retencionGanancias, setRetencionGanancias] = useState('');
  const [retencionIVA, setRetencionIVA] = useState('');
  const [retencionIIBB, setRetencionIIBB] = useState('');
  const [retencionSUSS, setRetencionSUSS] = useState('');


  // Data fetching
  const { firestore } = useUser();
  const projectsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const suppliersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);


  const project = useMemo(() => projects?.find(p => p.id === selectedProject), [selectedProject, projects]);
  const isContractBlocked = project?.balance === 0;
  // const isSupplierBlocked = selectedSupplier === 'SUP-03'; // Mock data for blocked supplier
  const isSupplierBlocked = false; // TODO: Implement supplier blocking logic
  
  const paymentMethods = ["Transferencia", "Efectivo", "Tarjeta", "Cheque", "Mercado Pago", "Otros"];

  useEffect(() => {
    setIsClient(true);
    setDate(new Date());
  }, []);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleReceiptAnalysis(selectedFile);
    }
  };

  const handleReceiptAnalysis = (fileToAnalyze: File) => {
    setIsExtracting(true);
    const reader = new FileReader();
    reader.readAsDataURL(fileToAnalyze);
    reader.onloadend = () => {
      startTransition(async () => {
        const dataUri = reader.result as string;
        const result = await extractInvoiceDataAction(dataUri, fileToAnalyze.size);
        
        if (result.data) {
          setAmount(result.data.total > 0 ? result.data.total.toString() : '');
          setIva(result.data.iva > 0 ? result.data.iva.toString() : '');
          setIibb(result.data.iibb > 0 ? result.data.iibb.toString() : '');
          setInvoiceNumber(result.data.invoiceNumber || '');
          if (result.data.iibbJurisdiction) {
            setIibbJurisdiction(result.data.iibbJurisdiction);
          }
          toast({
            title: "Factura analizada con IA",
            description: "Se completaron los campos fiscales. Por favor, verifíquelos.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error en la extracción",
            description: result.error || "No se pudieron extraer los datos de la factura.",
          });
        }
        setIsExtracting(false);
      });
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error de archivo", description: "No se pudo leer el archivo." });
      setIsExtracting(false);
    };
  };

  const handleSaveExpense = async () => {
    if (!selectedProject || !date || !selectedSupplier || !amount || !selectedCategory || !exchangeRate) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, complete todos los campos obligatorios.' });
      return;
    }
    if (documentType === 'Factura' && (!file || !invoiceNumber || !paymentMethod || (paymentMethod === 'Otros' && !paymentMethodOther))) {
      toast({ variant: 'destructive', title: 'Campos de Factura incompletos', description: 'Para facturas, debe adjuntar el comprobante y completar el número y medio de pago.' });
      return;
    }

    setIsSaving(true);
    if (!firestore || !user) {
      toast({variant: 'destructive', title: 'Error', description: "Firebase no está disponible."});
      setIsSaving(false);
      return;
    }

    try {
      const expensesColRef = collection(firestore, `projects/${selectedProject}/expenses`);
      const newExpenseRef = doc(expensesColRef);
      const expenseId = newExpenseRef.id;

      let receiptUrl = '';
      if (file && documentType === 'Factura') {
        const storage = getStorage();
        const filePath = `receipts/${selectedProject}/${expenseId}/${file.name}`;
        const fileRef = ref(storage, filePath);
        
        await uploadBytes(fileRef, file);
        receiptUrl = await getDownloadURL(fileRef);
      }

      const newExpense: Expense = {
        id: expenseId,
        projectId: selectedProject,
        date: date.toISOString(),
        supplierId: selectedSupplier,
        categoryId: selectedCategory,
        documentType,
        invoiceNumber: documentType === 'Factura' ? invoiceNumber : '',
        paymentMethod: documentType === 'Factura' ? (paymentMethod === 'Otros' ? paymentMethodOther : paymentMethod) : '',
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

      setDocumentNonBlocking(newExpenseRef, newExpense, {});
      
      toast({ title: 'Gasto guardado', description: 'El nuevo gasto ha sido registrado correctamente.' });
      setOpen(false);
      // Here you would typically reset the form state
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message || 'No se pudo registrar el gasto.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitDisabled = isPending || isExtracting || isSaving || isContractBlocked || isSupplierBlocked || !selectedProject || !selectedSupplier || !selectedCategory || !amount || !exchangeRate || (documentType === 'Factura' && (!file || !invoiceNumber || !paymentMethod || (paymentMethod === 'Otros' && !paymentMethodOther.trim())));
  
  if (!permissions.canLoadExpenses) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Cargar Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Complete los campos para registrar un nuevo gasto en el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
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
            <Select onValueChange={setSelectedProject} value={selectedProject ?? ''}>
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
            <Select onValueChange={setSelectedSupplier} value={selectedSupplier ?? ''}>
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
            <Select onValueChange={setSelectedCategory} value={selectedCategory ?? ''}>
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
              className="flex items-center gap-6"
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

          {documentType === 'Factura' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="receipt">Comprobante</Label>
                <div className="flex items-center gap-2">
                  <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic"/>
                  <Wand2 className="h-5 w-5 text-primary" title="Asistido por IA para extraer datos" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Nº Factura</Label>
                <div className="relative">
                    <Input id="invoiceNumber" type="text" placeholder="Nº de la factura" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Medio de Pago</Label>
                <Select onValueChange={(value) => setPaymentMethod(value)} value={paymentMethod ?? ''}>
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
            </>
          )}

          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup
              value={currency}
              onValueChange={(value: 'ARS' | 'USD') => setCurrency(value)}
              className="flex items-center gap-6"
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
                      {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iibb">Percepción IIBB</Label>
                  <div className="relative">
                      <Input id="iibb" type="number" placeholder="Percepción IIBB" value={iibb} onChange={(e) => setIibb(e.target.value)} />
                      {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
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
                {isExtracting && documentType === 'Factura' && <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin" />}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveExpense} disabled={isSubmitDisabled}>
            {(isPending || isExtracting || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
