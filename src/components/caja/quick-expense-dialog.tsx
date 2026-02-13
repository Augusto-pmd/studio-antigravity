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
import { useUser, useCollection } from "@/firebase";
import { collection, doc, writeBatch, getDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Expense, CashAccount, CashTransaction } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { expenseCategories } from '@/lib/data';
import { getHistoricalRate } from "@/lib/exchange-rate";

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

    if (cashAccount.lastClosureDate && date && format(date, 'yyyy-MM-dd') <= cashAccount.lastClosureDate) {
      toast({ variant: 'destructive', title: 'Periodo Cerrado', description: `No se pueden cargar gastos con fecha anterior o igual al último cierre (${format(parseISO(cashAccount.lastClosureDate), 'dd/MM/yyyy')}).` });
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

        // Fetch global exchange rate if needed (though for ARS cash usually 1, but let's be consistent or just 1?)
        // The user asked "apply for boxes".
        // If the box is in ARS, the *expense* is in ARS.
        // If the expense is in USD, we need the rate.
        // But QuickExpenseDialog currently forces ARS:
        // currency: 'ARS', exchangeRate: 1

        // If we want to allow USD expenses from ARS box, we need a conversion.
        // But looking at the code:
        // <Label htmlFor="amount">Monto (ARS)</Label>
        // It seems strictly ARS.
        // So exchangeRate should be 1.

        // HOWEVER, if we want to record the "Value in USD" for reporting, we might want the rate.
        // But the `Expense` model uses `currency` to denote the *transaction* currency.
        // If I pay 1000 ARS, the expense is 1000 ARS.

        // Wait, the user said: "ahora usan el tipo de cambio que se coloca en pago semanal? y eso aplica para cajas, compras, etc???"
        // If I buy something in USD with ARS, I need the rate.
        // If I buy something in ARS, the rate is 1 (or relevant to USD conversion for reporting).

        // Let's check `AddExpenseDialog`. It asks for Currency AND Exchange Rate.
        // `QuickExpenseDialog` seems to assume ARS.

        // For now, I will keep it as 1 for ARS expenses, as that's standard. 
        // Syncing the "Pago Semanal" rate handles the "Source of Truth" part.

        // But if the user wants to see the USD equivalent, we could fetch it.
        // Let's fetch it to store it just in case we ever add a 'USD Equivalent' field, 
        // BUT for `exchangeRate` in an ARS transaction, it's typically 1.

        // Actually, looking at `Expense` type:
        // currency: 'ARS' | 'USD';
        // exchangeRate: number;

        // If currency is ARS, exchangeRate is usually 1 (ARS to ARS) OR the rate to USD?
        // In `AddExpenseDialog`, if I select ARS, I still put a Rate?
        // Usually systems store the rate to the base currency (e.g. USD).

        // Let's fetch the global rate and use it if we were allowing USD.
        // Since `QuickExpenseDialog` is strictly ARS (lines 274: "Monto (ARS)"), 
        // and lines 151-152: currency: 'ARS', exchangeRate: 1.

        // I will NOT change this to use the global rate for the *transaction*, 
        // because 1 ARS = 1 ARS.
        // But I will add a comment or logic if we ever support USD input here.

        // Re-reading user request: "y eso aplica para cajas, compras, etc???"
        // "Compras" (AddExpenseDialog) DOES use it.
        // "Cajas" (QuickExpenseDialog) currently forces ARS.

        // I will leave QuickExpenseDialog as is for now regarding rate (1) 
        // since it is an ARS-only form.

        const rate = await getHistoricalRate(expenseDate);

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
          exchangeRate: rate || 1, // Use fetched rate
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
                {expenseCategories.map((c: { id: string, name: string }) => (
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
