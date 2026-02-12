'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useTransition, ChangeEvent, useMemo, useRef, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Expense, CashAccount, CashTransaction } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { expenseCategories } from '@/lib/data';

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function QuickExpenseDialog({ cashAccount }: { cashAccount?: CashAccount }) {
  const { user, firestore, permissions, firebaseApp } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Form State
  const [projectId, setProjectId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [iva, setIva] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());


  // Data fetching
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const resetForm = () => {
    setProjectId(undefined);
    setCategoryId(undefined);
    setAmount('');
    setDescription('');
    setReceiptFile(null);
    setIva('');
    setInvoiceNumber('');
    setDate(new Date());
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  };
  
  const handleSave = () => {
    if (!firestore || !user || !firebaseApp) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado o hay un problema de conexión.' });
        return;
    }
    if (!projectId || !amount || !description || !categoryId || !date) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Obra, categoría, fecha, monto y descripción son obligatorios.' });
        return;
    }

    if (!cashAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `No tiene una caja en ARS para debitar el gasto.` });
        return;
    }
    
    const expenseAmount = parseFloat(amount);
    if (cashAccount.balance < expenseAmount) {
        toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: `No tiene suficiente saldo en su caja de ARS.` });
        return;
    }

    startTransition(() => {
      const saveData = async () => {
        const project = projects?.find((p: Project) => p.id === projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const batch = writeBatch(firestore);

        // 1. Upload receipt if exists
        let receiptUrl = '';
        if (receiptFile) {
            const storage = getStorage(firebaseApp);
            const filePath = `receipts/${projectId}/${new Date().toISOString()}_${receiptFile.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, receiptFile);
            receiptUrl = await getDownloadURL(fileRef);
        }

        const expenseDate = date || new Date();

        // 2. Create Expense document
        const expenseRef = doc(collection(firestore, `projects/${projectId}/expenses`));
        const newExpense: Omit<Expense, 'id'> = {
            projectId: projectId,
            date: expenseDate.toISOString(),
            supplierId: 'logistica-vial', // Generic supplier for these expenses
            categoryId: categoryId,
            documentType: 'Recibo Común',
            paymentMethod: 'Efectivo',
            amount: expenseAmount,
            currency: 'ARS',
            exchangeRate: 1, // Since it's ARS cash, exchange rate is 1
            description: `Gasto rápido: ${description}`,
            receiptUrl: receiptUrl,
            status: 'Pagado',
            paidDate: expenseDate.toISOString(),
            paymentSource: 'Caja Chica',
        };
        batch.set(expenseRef, newExpense);
        
        // 3. Create CashTransaction document
        const transactionRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${cashAccount.id}/transactions`));
        const newTransaction: Omit<CashTransaction, 'id'> = {
            userId: user.uid,
            date: expenseDate.toISOString(),
            type: 'Egreso',
            amount: expenseAmount,
            currency: 'ARS',
            description: `Gasto en ${project.name}: ${description}`,
            relatedExpenseId: expenseRef.id,
            relatedProjectId: projectId,
            relatedProjectName: project.name
        };
        batch.set(transactionRef, newTransaction);

        // 4. Update CashAccount balance
        const accountRef = doc(firestore, `users/${user.uid}/cashAccounts/${cashAccount.id}`);
        const newBalance = cashAccount.balance - expenseAmount;
        batch.update(accountRef, { balance: newBalance });
        
        return batch.commit();
      };

      saveData()
        .then(() => {
          toast({ title: 'Gasto Rápido Guardado', description: `Se debitaron ${formatCurrency(expenseAmount, 'ARS')} de su caja.` });
          resetForm();
          setOpen(false);
        })
        .catch((error) => {
          console.error("Error writing to Firestore:", error);
          toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo registrar el gasto. Es posible que no tengas permisos.' });
        });
    });
  }

  if (!permissions?.canLoadExpenses) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Cargar Gasto Rápido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar Gasto Rápido</DialogTitle>
          <DialogDescription>
            Un formulario simple para registrar gastos de logística y compras menores desde la calle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Separator />
          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setProjectId} value={projectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {(projects || []).filter((p: Project) => p.status === 'En Curso').map((p: Project) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoría del Gasto</Label>
            <Select onValueChange={setCategoryId} value={categoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c: {id: string, name: string}) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha del Gasto</Label>
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
            <Label htmlFor="amount">Monto (ARS)</Label>
            <Input id="amount" type="number" value={amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Gasto</Label>
            <Textarea id="description" value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder="Ej: Compra de clavos y tornillos para..." />
          </div>
           <div className="space-y-2">
            <Label htmlFor="receipt-file">Comprobante (Opcional)</Label>
            <Input id="receipt-file" type="file" onChange={handleFileChange} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !projectId || !amount || !description || !categoryId || !date}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
