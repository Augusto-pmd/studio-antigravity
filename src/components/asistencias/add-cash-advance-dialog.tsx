'use client';

import { useState, useMemo, useEffect, ChangeEvent } from "react";
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
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser, useCollection } from '@/firebase';
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Employee, Project, CashAdvance, PayrollWeek, CashAccount, CashTransaction, TreasuryAccount, TreasuryTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const parseArgentinianNumber = (value: string): number => {
    if (!value) return 0;
    // Remove thousand separators (dots) and then replace decimal comma with a dot.
    const cleanedString = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedString);
    return isNaN(num) ? 0 : num;
}

const employeeConverter = {
    toFirestore(employee: Employee): DocumentData {
        const { id, ...data } = employee;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Employee {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            status: data.status,
            paymentType: data.paymentType,
            category: data.category,
            dailyWage: data.dailyWage,
            artExpiryDate: data.artExpiryDate,
            documents: data.documents,
            email: data.email,
            phone: data.phone,
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
        };
    }
};

const projectConverter = {
    toFirestore(project: Project): DocumentData {
        const { id, ...data } = project;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Project {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            client: data.client,
            address: data.address,
            currency: data.currency,
            projectType: data.projectType,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            supervisor: data.supervisor,
            budget: data.budget,
            balance: data.balance,
            progress: data.progress,
            description: data.description,
        };
    }
};

const cashAccountConverter = {
    toFirestore(account: CashAccount): DocumentData { return account; },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAccount {
        return { ...snapshot.data(options), id: snapshot.id } as CashAccount;
    }
};

const treasuryAccountConverter = {
    toFirestore(account: TreasuryAccount): DocumentData { return account; },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount {
        return { ...snapshot.data(options), id: snapshot.id } as TreasuryAccount;
    }
};

export function AddCashAdvanceDialog({ currentWeek }: { currentWeek?: PayrollWeek }) {
    const [open, setOpen] = useState(false);
    const { firestore, user } = useUser();
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    // FORM STATE
    const [date, setDate] = useState<Date | undefined>();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
    const [selectedCashAccountId, setSelectedCashAccountId] = useState<string | undefined>();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [installments, setInstallments] = useState('1');

    const [isClient, setIsClient] = useState(false);

    // DATA FETCHING
    const employeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

    // CASH ACCOUNTS
    const cashAccountsQuery = useMemo(() => (firestore ? collection(firestore, 'cashAccounts').withConverter(cashAccountConverter) : null), [firestore]);
    const { data: rawCashAccounts, isLoading: isLoadingCashAccounts } = useCollection<CashAccount>(cashAccountsQuery);

    // TREASURY ACCOUNTS
    const treasuryAccountsQuery = useMemo(() => (firestore ? collection(firestore, 'treasuryAccounts').withConverter(treasuryAccountConverter) : null), [firestore]);
    const { data: rawTreasuryAccounts, isLoading: isLoadingTreasuryAccounts } = useCollection<TreasuryAccount>(treasuryAccountsQuery);

    const currentUserCashAccount = useMemo(() => {
        if (!rawCashAccounts || !user) return undefined;
        return rawCashAccounts.find((account: CashAccount) => account.userId === user.uid);
    }, [rawCashAccounts, user]);

    useEffect(() => {
        if (currentUserCashAccount && !selectedCashAccountId) {
            setSelectedCashAccountId(`cash_${currentUserCashAccount.id}`);
        }
    }, [currentUserCashAccount, selectedCashAccountId]);

    // Unified Accounts List
    const unifiedAccounts = useMemo(() => {
        const accounts: { id: string, name: string, balance: number, type: 'Caja' | 'Tesorería', rawId: string }[] = [];
        if (rawTreasuryAccounts) {
            rawTreasuryAccounts.forEach((acc: TreasuryAccount) => {
                accounts.push({ id: `treasury_${acc.id}`, rawId: acc.id, name: acc.name, balance: acc.balance, type: 'Tesorería' });
            });
        }
        if (rawCashAccounts) {
            rawCashAccounts.forEach((acc: CashAccount) => {
                accounts.push({ id: `cash_${acc.id}`, rawId: acc.id, name: acc.name, balance: acc.balance, type: 'Caja' });
            });
        }
        // Sort by type, then name
        return accounts.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.name.localeCompare(b.name);
        });
    }, [rawCashAccounts, rawTreasuryAccounts]);

    useEffect(() => {
        if (currentUserCashAccount && !selectedCashAccountId) {
            setSelectedCashAccountId(currentUserCashAccount.id);
        }
    }, [currentUserCashAccount, selectedCashAccountId]);

    const resetForm = () => {
        setDate(new Date());
        setSelectedEmployeeId(undefined);
        setSelectedProjectId(undefined);
        // CashAccount maintains default
        setAmount('');
        setReason('');
        setInstallments('1');
    };

    useEffect(() => {
        setIsClient(true);
        if (open) {
            resetForm();
        }
    }, [open]);

    const handleSave = async () => {
        if (!firestore || !currentWeek) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay una semana de pagos activa.' });
            return;
        }
        if (!selectedEmployeeId || !date || !amount || !selectedCashAccountId) {
            toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Empleado, Caja, Fecha y Monto son obligatorios.' });
            return;
        }

        const selectedEmployee = employees?.find((e: Employee) => e.id === selectedEmployeeId);
        if (!selectedEmployee) {
            toast({ variant: 'destructive', title: 'Error', description: 'Empleado no válido.' });
            return;
        }

        const advanceAmount = parseArgentinianNumber(amount);
        if (advanceAmount <= 0) {
            toast({ variant: 'destructive', title: 'Monto inválido', description: 'El monto debe ser mayor a 0.' });
            return;
        }

        const selectedUnifiedAccount = unifiedAccounts.find(a => a.id === selectedCashAccountId);
        if (!selectedUnifiedAccount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cuenta de origen no válida.' });
            return;
        }

        if (selectedUnifiedAccount.balance < advanceAmount) {
            toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'La cuenta seleccionada no tiene fondos suficientes para este adelanto.' });
            return;
        }

        setIsPending(true);
        try {
            const batch = writeBatch(firestore);
            const selectedProject = projects?.find((p: Project) => p.id === selectedProjectId);

            // 1. Create the CashAdvance
            const advancesCollection = collection(firestore, 'cashAdvances');
            const advanceRef = doc(advancesCollection);
            const advanceId = advanceRef.id;

            const newAdvance: CashAdvance = {
                id: advanceId,
                payrollWeekId: currentWeek.id,
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.name,
                projectId: selectedProject?.id,
                projectName: selectedProject?.name,
                date: date.toISOString(),
                amount: advanceAmount,
                reason: reason || undefined,
                installments: parseInt(installments) || 1,
                createdAt: new Date().toISOString(),
            };
            batch.set(advanceRef, newAdvance);

            // 2 & 3. Create Transaction and Update Balance based on Account Type
            const isCashAcc = selectedUnifiedAccount.type === 'Caja';
            const accountRawId = selectedUnifiedAccount.rawId;

            if (isCashAcc) {
                const transactionsCollection = collection(firestore, 'cashTransactions');
                const transactionRef = doc(transactionsCollection);
                const newTransaction: Omit<CashTransaction, 'id'> = {
                    userId: accountRawId, // En cajas el userId y accountId a veces se solapan, pero usamos el standard
                    date: new Date().toISOString(),
                    type: 'Egreso',
                    amount: advanceAmount,
                    currency: 'ARS',
                    description: `Adelanto de sueldo a ${selectedEmployee.name} - ${reason || ''}`,
                    relatedProjectId: selectedProject?.id,
                    relatedProjectName: selectedProject?.name,
                };

                // Si la lógica de tu bd guardaba el UserId verdadero en la caja:
                const realCashAccount = rawCashAccounts?.find((c: CashAccount) => c.id === accountRawId);
                if (realCashAccount) newTransaction.userId = realCashAccount.userId;
                else newTransaction.userId = user!.uid;

                batch.set(transactionRef, { ...newTransaction, id: transactionRef.id });

                const accountRef = doc(firestore, 'cashAccounts', accountRawId);
                batch.update(accountRef, { balance: selectedUnifiedAccount.balance - advanceAmount });
            } else {
                // Treasury Account
                const transactionsCollection = collection(firestore, `treasuryAccounts/${accountRawId}/transactions`);
                const transactionRef = doc(transactionsCollection);
                const newTransaction: Omit<TreasuryTransaction, 'id'> = {
                    treasuryAccountId: accountRawId,
                    type: 'Egreso',
                    date: new Date().toISOString(),
                    amount: advanceAmount,
                    description: `Adelanto de sueldo a ${selectedEmployee.name} - ${reason || ''}`,
                    currency: 'ARS',
                    category: 'Sueldos y Adelantos',
                };
                batch.set(transactionRef, { ...newTransaction, id: transactionRef.id });

                const accountRef = doc(firestore, 'treasuryAccounts', accountRawId);
                batch.update(accountRef, { balance: selectedUnifiedAccount.balance - advanceAmount });
            }

            await batch.commit();

            toast({
                title: 'Adelanto Registrado',
                description: `Se ha guardado el adelanto para ${selectedEmployee.name}.`,
            });
            setOpen(false);
        } catch (error) {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar el adelanto. Es posible que no tengas permisos.",
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={!currentWeek}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Adelanto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Adelanto de Sueldo</DialogTitle>
                    <DialogDescription>
                        Complete el formulario para registrar un nuevo adelanto.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="employee">Empleado</Label>
                        <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isLoadingEmployees}>
                            <SelectTrigger id="employee">
                                <SelectValue placeholder="Seleccione un empleado" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees?.filter((e: Employee) => e.status === 'Activo').map((e: Employee) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cashAccount">Caja de Origen</Label>
                        <Select onValueChange={setSelectedCashAccountId} value={selectedCashAccountId} disabled={isLoadingCashAccounts || isLoadingTreasuryAccounts}>
                            <SelectTrigger id="cashAccount">
                                <SelectValue placeholder="Seleccione de dónde sale el dinero" />
                            </SelectTrigger>
                            <SelectContent>
                                {unifiedAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name} ({account.type}) - Saldo: ${account.balance.toLocaleString('es-AR')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project">Obra (Opcional)</Label>
                        <Select onValueChange={setSelectedProjectId} value={selectedProjectId} disabled={isLoadingProjects}>
                            <SelectTrigger id="project">
                                <SelectValue placeholder="Imputar a una obra (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects?.filter((p: Project) => p.status === 'En Curso').map((p: Project) => (
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
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto Total</Label>
                            <Input id="amount" type="text" placeholder="ARS" value={amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="installments">Cuotas</Label>
                            <Input
                                id="installments"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="1"
                                value={installments}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setInstallments(e.target.value)}
                            />
                        </div>
                    </div>
                    {amount && installments && (
                        <p className="text-sm text-muted-foreground">
                            {parseArgentinianNumber(amount) > 0 && parseInt(installments) > 0
                                ? `Se descontarán ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseArgentinianNumber(amount) / parseInt(installments))} por semana.`
                                : ''}
                        </p>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="reason">Motivo</Label>
                        <Textarea id="reason" placeholder="Motivo del adelanto (opcional)" value={reason} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleSave} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Adelanto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
