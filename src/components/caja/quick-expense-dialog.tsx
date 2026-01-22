'use client';

import { useState, useTransition, ChangeEvent } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, PlusCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Expense, CashAccount, CashTransaction } from "@/lib/types";
import { expenseCategories } from "@/lib/data";
import { Textarea } from "../ui/textarea";

export function QuickExpenseDialog({ arsAccount, usdAccount }: { arsAccount?: CashAccount, usdAccount?: CashAccount }) {
  const { user, firestore, permissions } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [projectId, setProjectId] = useState<string | undefined>();
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Data fetching
  const projectsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'projects') : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setProjectId(undefined);
    setCurrency('ARS');
    setAmount('');
    setDescription('');
    setReceiptFile(null);
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const handleSave = () => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado.' });
        return;
    }
    if (!projectId || !amount || !description) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Obra, monto y descripción son obligatorios.' });
        return;
    }

    const selectedAccount = currency === 'ARS' ? arsAccount : usdAccount;
    if (!selectedAccount) {
        toast({ variant: 'destructive', title: 'Error', description: `No tiene una caja en ${currency} para debitar el gasto.` });
        return;
    }
    
    const expenseAmount = parseFloat(amount);
    if (selectedAccount.balance < expenseAmount) {
        toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: `No tiene suficiente saldo en su caja de ${currency}.` });
        return;
    }

    startTransition(async () => {
        try {
            const project = projects?.find(p => p.id === projectId);
            if (!project) throw new Error("Proyecto no encontrado");

            // 1. Upload receipt if exists
            let receiptUrl = '';
            if (receiptFile) {
                const storage = getStorage();
                const filePath = `receipts/${projectId}/${new Date().toISOString()}_${receiptFile.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, receiptFile);
                receiptUrl = await getDownloadURL(fileRef);
            }

            const expenseDate = new Date();

            // 2. Create Expense document
            const expenseRef = doc(collection(firestore, `projects/${projectId}/expenses`));
            const newExpense: Expense = {
                id: expenseRef.id,
                projectId: projectId,
                date: expenseDate.toISOString(),
                supplierId: 'logistica-vial', // Generic supplier for these expenses
                categoryId: 'CAT-04', // Transporte y Logística
                documentType: 'Recibo Común',
                amount: expenseAmount,
                currency: currency,
                exchangeRate: 1, // Assume 1 for simplicity, can be improved later
                description: `Gasto rápido: ${description}`,
                receiptUrl: receiptUrl,
            };
            setDocumentNonBlocking(expenseRef, newExpense, {});
            
            // 3. Create CashTransaction document
            const transactionRef = doc(collection(firestore, `users/${user.uid}/cashAccounts/${selectedAccount.id}/transactions`));
            const newTransaction: CashTransaction = {
                id: transactionRef.id,
                userId: user.uid,
                date: expenseDate.toISOString(),
                type: 'Egreso',
                amount: expenseAmount,
                currency: currency,
                description: `Gasto en ${project.name}: ${description}`,
                relatedExpenseId: expenseRef.id,
                relatedProjectId: projectId,
                relatedProjectName: project.name
            };
            setDocumentNonBlocking(transactionRef, newTransaction, {});

            // 4. Update CashAccount balance (read-then-write, not ideal but constrained)
            const accountRef = doc(firestore, `users/${user.uid}/cashAccounts/${selectedAccount.id}`);
            const newBalance = selectedAccount.balance - expenseAmount;
            updateDocumentNonBlocking(accountRef, { balance: newBalance });

            toast({ title: 'Gasto Rápido Guardado', description: `Se debitaron ${formatCurrency(expenseAmount, currency)} de su caja.` });
            resetForm();
            setOpen(false);

        } catch (error: any) {
            console.error("Error saving quick expense:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: error.message || 'No se pudo registrar el gasto.' });
        }
    });
  }

  if (!permissions.canLoadExpenses) return null;

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
          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setProjectId} value={projectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects?.filter(p => p.status === 'En Curso').map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup value={currency} onValueChange={(v: 'ARS' | 'USD') => setCurrency(v)} className="flex items-center gap-6 pt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ARS" id="ars-quick" />
                <Label htmlFor="ars-quick">ARS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="usd-quick" />
                <Label htmlFor="usd-quick">USD</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Gasto</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Compra de clavos y tornillos para..." />
          </div>
           <div className="space-y-2">
            <Label htmlFor="receipt-file">Comprobante (Opcional)</Label>
            <Input id="receipt-file" type="file" onChange={handleFileChange} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !projectId || !amount || !description}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    