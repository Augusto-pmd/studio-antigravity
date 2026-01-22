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
import { projects, suppliers, expenseCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Wand2, Loader2, PlusCircle, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { extractInvoiceDataAction } from "@/lib/actions";
import { useUser } from "@/context/user-context";

export function AddExpenseDialog() {
  const { permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [date, setDate] = useState<Date>();
  const [isClient, setIsClient] = useState(false);
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  
  const [documentType, setDocumentType] = useState<'Factura' | 'Recibo Común'>('Factura');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [iva, setIva] = useState('');
  const [iibb, setIibb] = useState('');
  const [iibbJurisdiction, setIibbJurisdiction] = useState<'No Aplica' | 'CABA' | 'Provincia'>('No Aplica');
  const [isExtracting, setIsExtracting] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === selectedProject), [selectedProject]);
  const isContractBlocked = project?.balance === 0;
  const isSupplierBlocked = selectedSupplier === 'SUP-03'; // Proveedor Vencido ART

  useEffect(() => {
    if (isClient) {
      setDate(new Date());
    }
  }, [isClient]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIva('');
    setAmount('');
    setInvoiceNumber('');
    setIibb('');
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

  const isSubmitDisabled = isPending || isExtracting || isContractBlocked || isSupplierBlocked || (documentType === 'Factura' && (!file || !invoiceNumber));
  
  if (!permissions.canLoadExpenses) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Cargar Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cargar Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Complete los campos para registrar un nuevo gasto en el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Obra
            </Label>
            <Select onValueChange={setSelectedProject} value={selectedProject ?? ''}>
              <SelectTrigger id="project" className="col-span-3">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date && isClient ? format(date, "PPP") : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">
              Proveedor
            </Label>
            <Select onValueChange={setSelectedSupplier} value={selectedSupplier ?? ''}>
              <SelectTrigger id="supplier" className="col-span-3">
                <SelectValue placeholder="Seleccione un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Rubro
            </Label>
            <Select>
              <SelectTrigger id="category" className="col-span-3">
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
           <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tipo Comprob.</Label>
             <RadioGroup
              value={documentType}
              onValueChange={(value: 'Factura' | 'Recibo Común') => setDocumentType(value)}
              className="col-span-3 flex items-center gap-6"
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receipt" className="text-right">
                  Comprobante
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic"/>
                  <Wand2 className="h-5 w-5 text-primary" title="Asistido por IA para extraer datos" />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="invoiceNumber" className="text-right">Nº Factura</Label>
                <div className="col-span-3 relative">
                    <Input id="invoiceNumber" type="text" placeholder="Nº de la factura" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Moneda</Label>
            <RadioGroup
              value={currency}
              onValueChange={(value: 'ARS' | 'USD') => setCurrency(value)}
              className="col-span-3 flex items-center gap-6"
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exchangeRate" className="text-right">
              Tipo de Cambio
            </Label>
            <Input
              id="exchangeRate"
              type="number"
              placeholder="Dólar BNA compra"
              className="col-span-3"
            />
          </div>
          
          {documentType === 'Factura' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iva" className="text-right">IVA</Label>
                <div className="col-span-3 relative">
                    <Input id="iva" type="number" placeholder="IVA del gasto" value={iva} onChange={(e) => setIva(e.target.value)} />
                    {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iibb" className="text-right">IIBB</Label>
                <div className="col-span-3 relative">
                    <Input id="iibb" type="number" placeholder="Percepción IIBB" value={iibb} onChange={(e) => setIibb(e.target.value)} />
                    {isExtracting && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Jurisdicción IIBB</Label>
                 <RadioGroup 
                    value={iibbJurisdiction} 
                    onValueChange={(v) => setIibbJurisdiction(v as any)} 
                    className="col-span-3 flex items-center gap-6 pt-2"
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
            </>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto Total
            </Label>
             <div className="col-span-3 relative">
                <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {isExtracting && documentType === 'Factura' && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitDisabled}>
            {(isPending || isExtracting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
