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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { projects, suppliers, expenseCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, FileCheck2, Loader2, PlusCircle, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { validateDocumentAction } from "@/lib/actions";
import { useUser } from "@/context/user-context";

export function AddExpenseDialog() {
  const { permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null);
  const [isCheckingFile, setIsCheckingFile] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === selectedProject), [selectedProject]);
  const isContractBlocked = project?.balance === 0;
  const isSupplierBlocked = selectedSupplier === 'SUP-03'; // Proveedor Vencido ART

  useEffect(() => {
    setDate(new Date());
  }, []);

  useEffect(() => {
    if (file) {
      handleFileValidation(file);
    }
  }, [file]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileValidation(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleFileValidation = (fileToValidate: File) => {
    setIsCheckingFile(true);
    const reader = new FileReader();
    reader.readAsDataURL(fileToValidate);
    reader.onloadend = () => {
      startTransition(async () => {
        const dataUri = reader.result as string;
        const result = await validateDocumentAction(dataUri, fileToValidate.type, fileToValidate.size);
        if (!result.isValid) {
          setFileValidation({ isValid: false, errors: result.validationErrors });
          toast({
            variant: "destructive",
            title: "Error en el Comprobante",
            description: result.validationErrors.join("\n"),
          });
        } else {
          setFileValidation({ isValid: true, errors: [] });
           toast({
            title: "Comprobante Verificado",
            description: "El archivo del comprobante es válido.",
          });
        }
        setIsCheckingFile(false);
      });
    };
    reader.onerror = () => {
      setFileValidation({ isValid: false, errors: ['Error al leer el archivo.'] });
      setIsCheckingFile(false);
    };
  };

  const isSubmitDisabled = isPending || isCheckingFile || isContractBlocked || isSupplierBlocked || !file || fileValidation?.isValid === false;
  
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
                  {date ? format(date, "PPP") : <span>Seleccione una fecha</span>}
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
            <Label htmlFor="amount" className="text-right">
              Monto
            </Label>
            <Input id="amount" type="number" placeholder="ARS" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="receipt" className="text-right">
              Comprobante
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic"/>
              {isCheckingFile && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {fileValidation?.isValid && <FileCheck2 className="h-5 w-5 text-green-500" />}
              {fileValidation?.isValid === false && <TriangleAlert className="h-5 w-5 text-destructive" />}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitDisabled}>
            {(isPending || isCheckingFile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
