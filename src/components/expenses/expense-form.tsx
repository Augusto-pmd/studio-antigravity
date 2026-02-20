'use client';

import { useState, useTransition, useEffect, ChangeEvent, useMemo, useRef } from "react";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { expenseCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, Link as LinkIcon, Sparkles, TriangleAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, doc, setDoc, getDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Supplier, Expense } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

import { Textarea } from "@/components/ui/textarea";
import { getHistoricalRate } from "@/lib/exchange-rate";

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

const parseOptionalFloat = (value: string): number | undefined => {
    if (value === null || value.trim() === '') {
        return undefined;
    }
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
};

const expenseSchema = z.object({
    projectId: z.string().min(1, "La obra es obligatoria"),
    date: z.date({ required_error: "La fecha es obligatoria" }),
    supplierId: z.string().min(1, "El proveedor es obligatorio"),
    categoryId: z.string().min(1, "El rubro es obligatorio"),
    paymentSource: z.enum(['Tesorería', 'Caja Chica']),
    description: z.string().optional(),
    documentType: z.enum(['Factura', 'Recibo Común', 'Nota de Crédito']),
    invoiceNumber: z.string().optional(),
    currency: z.enum(['ARS', 'USD']),
    exchangeRate: z.coerce.number().min(0.01, "El tipo de cambio es obligatorio"),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
    iva: z.coerce.number().optional(),
    iibb: z.coerce.number().optional(),
    iibbJurisdiction: z.enum(['No Aplica', 'CABA', 'Provincia']).default('No Aplica'),
    retencionGanancias: z.coerce.number().optional(),
    retencionIVA: z.coerce.number().optional(),
    retencionIIBB: z.coerce.number().optional(),
    retencionSUSS: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if ((data.documentType === 'Factura' || data.documentType === 'Nota de Crédito') && (!data.invoiceNumber || data.invoiceNumber.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El número de comprobante es obligatorio para facturas y notas de crédito",
            path: ["invoiceNumber"]
        });
    }
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    expense?: Expense;
    projectId?: string;
    onSuccess: () => void;
}

export function ExpenseForm({ expense, projectId: defaultProjectId, onSuccess }: ExpenseFormProps) {
    const { user, permissions, firestore, firebaseApp } = useUser();
    const { toast, dismiss } = useToast();
    const [isPending, startTransition] = useTransition();
    const isEditMode = !!expense;

    const [isClient, setIsClient] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            projectId: defaultProjectId || expense?.projectId || '',
            supplierId: expense?.supplierId || '',
            categoryId: expense?.categoryId || '',
            description: expense?.description || '',
            currency: expense?.currency || 'ARS',
            paymentSource: expense?.paymentSource || 'Tesorería',
            documentType: expense?.documentType || 'Factura',
            invoiceNumber: expense?.invoiceNumber || '',
            amount: expense?.amount || 0,
            iva: expense?.iva || 0,
            iibb: expense?.iibb || 0,
            iibbJurisdiction: expense?.iibbJurisdiction || 'No Aplica',
            exchangeRate: expense?.exchangeRate || 0,
            retencionGanancias: expense?.retencionGanancias || 0,
            retencionIVA: expense?.retencionIVA || 0,
            retencionIIBB: expense?.retencionIIBB || 0,
            retencionSUSS: expense?.retencionSUSS || 0,
        }
    });

    const watchedProjectId = form.watch("projectId");
    const watchedSupplierId = form.watch("supplierId");
    const watchedDate = form.watch("date");
    const watchedDocumentType = form.watch("documentType");

    const project = useMemo(() => projects?.find((p: Project) => p.id === watchedProjectId), [watchedProjectId, projects]);
    const supplier = useMemo(() => suppliers?.find((s: Supplier) => s.id === watchedSupplierId), [watchedSupplierId, suppliers]);

    const isContractBlocked = project?.balance === 0;

    const isSupplierBlocked = useMemo(() => {
        if (!supplier) return false;
        const today = new Date().toISOString().split('T')[0];

        if (supplier.insuranceExpiryDate && supplier.insuranceExpiryDate < today) return true;
        if (supplier.artExpiryDate && supplier.artExpiryDate < today) return true;

        return false;
    }, [supplier]);

    const resetForm = () => {
        form.reset({
            projectId: defaultProjectId || expense?.projectId || '',
            date: expense?.date ? parseISO(expense.date) : new Date(),
            supplierId: expense?.supplierId || '',
            categoryId: expense?.categoryId || '',
            description: expense?.description || '',
            currency: expense?.currency || 'ARS',
            paymentSource: expense?.paymentSource || 'Tesorería',
            documentType: expense?.documentType || 'Factura',
            invoiceNumber: expense?.invoiceNumber || '',
            amount: expense?.amount || 0,
            iva: expense?.iva || 0,
            iibb: expense?.iibb || 0,
            iibbJurisdiction: expense?.iibbJurisdiction || 'No Aplica',
            exchangeRate: expense?.exchangeRate || 0,
            retencionGanancias: expense?.retencionGanancias || 0,
            retencionIVA: expense?.retencionIVA || 0,
            retencionIIBB: expense?.retencionIIBB || 0,
            retencionSUSS: expense?.retencionSUSS || 0,
        });
        setFile(null);
    };

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            projectId: defaultProjectId || expense?.projectId || '',
            supplierId: expense?.supplierId || '',
            categoryId: expense?.categoryId || '',
            description: expense?.description || '',
            currency: expense?.currency || 'ARS',
            paymentSource: expense?.paymentSource || 'Tesorería',
            documentType: expense?.documentType || 'Factura',
            invoiceNumber: expense?.invoiceNumber || '',
            amount: expense?.amount || 0,
            iva: expense?.iva || 0,
            iibb: expense?.iibb || 0,
            iibbJurisdiction: expense?.iibbJurisdiction || 'No Aplica',
            exchangeRate: expense?.exchangeRate || 0,
            retencionGanancias: expense?.retencionGanancias || 0,
            retencionIVA: expense?.retencionIVA || 0,
            retencionIIBB: expense?.retencionIIBB || 0,
            retencionSUSS: expense?.retencionSUSS || 0,
        }
    });

    const watchedProjectId = form.watch("projectId");
    const watchedSupplierId = form.watch("supplierId");
    const watchedDate = form.watch("date");
    const watchedDocumentType = form.watch("documentType");

    // Data fetching
    const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
    const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
    const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

    const project = useMemo(() => projects?.find((p: Project) => p.id === watchedProjectId), [watchedProjectId, projects]);
    const supplier = useMemo(() => suppliers?.find((s: Supplier) => s.id === watchedSupplierId), [watchedSupplierId, suppliers]);

    const isContractBlocked = project?.balance === 0;

    const isSupplierBlocked = useMemo(() => {
        if (!supplier) return false;
        const today = new Date().toISOString().split('T')[0];

        if (supplier.insuranceExpiryDate && supplier.insuranceExpiryDate < today) return true;
        if (supplier.artExpiryDate && supplier.artExpiryDate < today) return true;

        return false;
    }, [supplier]);

    const resetForm = () => {
        form.reset({
            projectId: defaultProjectId || expense?.projectId || '',
            date: expense?.date ? parseISO(expense.date) : new Date(),
            supplierId: expense?.supplierId || '',
            categoryId: expense?.categoryId || '',
            description: expense?.description || '',
            currency: expense?.currency || 'ARS',
            paymentSource: expense?.paymentSource || 'Tesorería',
            documentType: expense?.documentType || 'Factura',
            invoiceNumber: expense?.invoiceNumber || '',
            amount: expense?.amount || 0,
            iva: expense?.iva || 0,
            iibb: expense?.iibb || 0,
            iibbJurisdiction: expense?.iibbJurisdiction || 'No Aplica',
            exchangeRate: expense?.exchangeRate || 0,
            retencionGanancias: expense?.retencionGanancias || 0,
            retencionIVA: expense?.retencionIVA || 0,
            retencionIIBB: expense?.retencionIIBB || 0,
            retencionSUSS: expense?.retencionSUSS || 0,
        });
        setFile(null);
    };

    // Auto-fetch historical exchange rate when date changes
    useEffect(() => {
        if (watchedDate) {
            const fetchRate = async () => {
                const rate = await getHistoricalRate(watchedDate);
                if (rate > 0) {
                    form.setValue("exchangeRate", rate);
                }
            };
            fetchRate();
        }
    }, [watchedDate, form]);

    useEffect(() => {
        resetForm();
    }, [expense, defaultProjectId]);

    useEffect(() => {
        setIsClient(true);
        if (!expense) {
            form.setValue("date", new Date());
        }
    }, [expense, form]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleFileScan = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        toast({ title: 'Analizando comprobante...', description: 'La IA está leyendo los datos (Gemini 1.5 Flash). Esto puede tardar unos segundos.' });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/scan-receipt', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to analyze receipt');
            }

            const extractedData = await response.json();

            setFile(file);
            dismiss();
            toast({ title: 'Datos Extraídos', description: 'Revisa la información precargada en el formulario.' });

            if (extractedData.amount) form.setValue("amount", Number(extractedData.amount));

            if (extractedData.invoiceNumber) form.setValue("invoiceNumber", extractedData.invoiceNumber);

            if (extractedData.date) {
                // API returns YYYY-MM-DD
                const [year, month, day] = extractedData.date.split('-').map(Number);
                const utcDate = new Date(year, month - 1, day);
                form.setValue("date", utcDate);
            }

            if (extractedData.currency) {
                form.setValue("currency", extractedData.currency as 'ARS' | 'USD');
            }

            let matchedSupplier: Supplier | undefined;

            if (extractedData.supplierCuit && suppliers) {
                matchedSupplier = suppliers.find((s: Supplier) => s.cuit?.replace(/-/g, '') === extractedData.supplierCuit!.replace(/-/g, ''));
                if (matchedSupplier) {
                    form.setValue("supplierId", matchedSupplier.id);
                    toast({ title: 'Proveedor Encontrado', description: `Se ha seleccionado a "${matchedSupplier.name}" por CUIT.` });
                }
            }

            // Fallback to name search if CUIT didn't match
            if (!matchedSupplier && extractedData.supplierName && suppliers) {
                matchedSupplier = suppliers.find((s: Supplier) =>
                    s.name.toLowerCase().includes(extractedData.supplierName!.toLowerCase()) ||
                    extractedData.supplierName!.toLowerCase().includes(s.name.toLowerCase())
                );
                if (matchedSupplier) {
                    form.setValue("supplierId", matchedSupplier.id);
                    toast({ title: 'Proveedor Encontrado', description: `Se ha seleccionado a "${matchedSupplier.name}" por Nombre.` });
                }
            }

            if (extractedData.category) {
                // Simple keyword matching for category
                const categoryName = extractedData.category.toLowerCase();
                const matchedCategory = expenseCategories.find(c => c.name.toLowerCase().includes(categoryName));
                if (matchedCategory) {
                    form.setValue("categoryId", matchedCategory.id);
                }
            } else if (matchedSupplier) {
                // Auto-fill category based on Supplier Type
                if (matchedSupplier.type === 'Materiales') form.setValue("categoryId", 'CAT-01'); // Materiales de Construcción
                else if (matchedSupplier.type === 'Servicios') form.setValue("categoryId", 'CAT-15'); // Servicios
                else if (matchedSupplier.type === 'Mixto') form.setValue("categoryId", 'CAT-12'); // Otros
            }

            // Auto-fill Document Type based on fiscal condition if not detected
            if (matchedSupplier) {
                if (matchedSupplier.fiscalCondition === 'Responsable Inscripto' || matchedSupplier.fiscalCondition === 'Monotributo') {
                    form.setValue("documentType", 'Factura');
                }
            }

        } catch (error) {
            console.error("Error extracting invoice data:", error);
            dismiss();
            toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudieron extraer los datos del comprobante.' });
        } finally {
            setIsExtracting(false);
            // Clear input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveExpense = form.handleSubmit((data) => {
        if (!firestore || !user || !firebaseApp) {
            toast({ variant: 'destructive', title: 'Error', description: "Firebase no está disponible." });
            return;
        }

        startTransition(() => {
            setIsSaving(true);
            const saveData = async () => {
                const projectId = isEditMode && expense ? expense.projectId : data.projectId;
                const expenseRef = isEditMode
                    ? doc(firestore, 'projects', projectId, 'expenses', expense.id)
                    : doc(collection(firestore, 'projects', projectId, 'expenses'));

                let receiptUrl = expense?.receiptUrl || '';
                if (file) {
                    const storage = getStorage(firebaseApp);
                    const filePath = `receipts/${projectId}/${expenseRef.id}/${file.name}`;
                    const fileRef = ref(storage, filePath);

                    await uploadBytes(fileRef, file);
                    receiptUrl = await getDownloadURL(fileRef);
                }

                const expenseData: Partial<Expense> = {
                    id: expenseRef.id,
                    projectId: projectId,
                    date: data.date.toISOString(),
                    supplierId: data.supplierId,
                    categoryId: data.categoryId,
                    documentType: data.documentType,
                    amount: data.amount,
                    currency: data.currency,
                    paymentSource: data.paymentSource,
                    exchangeRate: data.exchangeRate,
                    status: isEditMode ? expense.status : 'Pendiente de Pago',
                };

                if (data.description) expenseData.description = data.description;
                if (receiptUrl) expenseData.receiptUrl = receiptUrl;

                if (data.documentType === 'Factura' || data.documentType === 'Nota de Crédito') {
                    expenseData.invoiceNumber = data.invoiceNumber;
                    expenseData.iibbJurisdiction = data.iibbJurisdiction;
                    if (data.iva !== undefined) expenseData.iva = data.iva;
                    if (data.iibb !== undefined) expenseData.iibb = data.iibb;
                } else {
                    expenseData.iibbJurisdiction = 'No Aplica';
                }

                if (data.retencionGanancias !== undefined) expenseData.retencionGanancias = data.retencionGanancias;
                if (data.retencionIVA !== undefined) expenseData.retencionIVA = data.retencionIVA;
                if (data.retencionIIBB !== undefined) expenseData.retencionIIBB = data.retencionIIBB;
                if (data.retencionSUSS !== undefined) expenseData.retencionSUSS = data.retencionSUSS;

                if (isEditMode && expense) {
                    if (expense.paymentMethod) expenseData.paymentMethod = expense.paymentMethod;
                    if (expense.paidDate) expenseData.paidDate = expense.paidDate;
                    if (expense.treasuryAccountId) expenseData.treasuryAccountId = expense.treasuryAccountId;
                }

                return setDoc(expenseRef, expenseData, { merge: true });
            };

            saveData()
                .then(() => {
                    toast({ title: isEditMode ? 'Documento Actualizado' : 'Documento Guardado', description: 'El documento ha sido guardado correctamente.' });
                    onSuccess();
                })
                .catch((error: any) => {
                    console.error("Error writing to Firestore:", error);
                    const description = "No se pudo registrar el documento. Por favor, revise los datos e inténtelo de nuevo.";
                    toast({ variant: 'destructive', title: 'Error al guardar', description });
                })
                .finally(() => {
                    setIsSaving(false);
                });
        });
    });

    const isSubmitDisabled = isPending || isSaving || isContractBlocked || isSupplierBlocked;

    return (
        <div className="grid gap-4 py-4 pr-1">
            <div className="space-y-2">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting || isPending}
                >
                    {isExtracting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Escanear Comprobante con IA
                </Button>
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileScan}
                />
                <p className="text-xs text-center text-muted-foreground">O cargue los datos manualmente</p>
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
                        {supplier?.insuranceExpiryDate && supplier.insuranceExpiryDate < new Date().toISOString().split('T')[0]
                            ? `El Seguro del proveedor venció el ${format(parseISO(supplier.insuranceExpiryDate), 'dd/MM/yyyy')}.`
                            : supplier?.artExpiryDate && supplier.artExpiryDate < new Date().toISOString().split('T')[0]
                                ? `La ART del proveedor venció el ${format(parseISO(supplier.artExpiryDate), 'dd/MM/yyyy')}.`
                                : "La documentación del proveedor está vencida."}
                        No se pueden cargar gastos hasta que se actualice.
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Obra</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!defaultProjectId || isEditMode || isLoadingProjects}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione una obra" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {projects?.map((p: Project) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col pt-2">
                                <FormLabel>Fecha</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value && isClient ? (
                                                    format(field.value, "PPP", { locale: es })
                                                ) : (
                                                    <span>Seleccione una fecha</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                            locale={es}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proveedor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingSuppliers}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione un proveedor" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {suppliers?.map((s: Supplier) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rubro</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione un rubro" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {expenseCategories.map((c: { id: string; name: string }) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="paymentSource"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Vía Contable / Origen del Pago</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center gap-6 pt-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Tesorería" id="tesoreria" />
                                            <Label htmlFor="tesoreria">Tesorería (Formal)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Caja Chica" id="caja-chica" />
                                            <Label htmlFor="caja-chica">Caja Chica (Informal)</Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Descripción (Opcional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Añada un detalle sobre el gasto"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Tipo Comprobante</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center flex-wrap gap-x-6 gap-y-2 pt-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Factura" id="factura" />
                                            <Label htmlFor="factura">Factura</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Recibo Común" id="recibo" />
                                            <Label htmlFor="recibo">Recibo Común</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Nota de Crédito" id="nota-credito" />
                                            <Label htmlFor="nota-credito">Nota de Crédito</Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(watchedDocumentType === 'Factura' || watchedDocumentType === 'Nota de Crédito') && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="receipt">Comprobante (Archivo)</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic" />
                                    {isEditMode && expense?.receiptUrl && (
                                        <Button asChild variant="outline" size="icon">
                                            <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <FormField
                                control={form.control}
                                name="invoiceNumber"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel>Nº Comprobante</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nº de la factura o nota de crédito" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Moneda</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
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
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="exchangeRate"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Tipo de Cambio *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="Dólar BNA compra"
                                        {...field}
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        readOnly={!permissions.canSupervise}
                                        className={cn("bg-muted", permissions.canSupervise && "bg-background")}
                                    />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                    {permissions.canSupervise
                                        ? "Calculado automáticamente. Puede editarlo manualmente."
                                        : "Calculado automáticamente segun fecha. Solo Dirección puede modificarlo."}
                                </p>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(watchedDocumentType === 'Factura' || watchedDocumentType === 'Nota de Crédito') && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Impuestos y Percepciones</h4>
                                <FormField
                                    control={form.control}
                                    name="iva"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel>IVA</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="IVA del gasto" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="iibb"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel>Percepción IIBB</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Percepción IIBB" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="iibbJurisdiction"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel>Jurisdicción IIBB</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
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
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground">Retenciones Aplicadas al Pago</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="retencionGanancias"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Ret. Ganancias</FormLabel>
                                                <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="retencionIVA"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Ret. IVA</FormLabel>
                                                <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="retencionIIBB"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Ret. IIBB</FormLabel>
                                                <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="retencionSUSS"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>Ret. SUSS</FormLabel>
                                                <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-lg">Monto Total</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0.00" className="text-lg h-12" {...field} value={field.value === 0 ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="mt-4">
                        <Button type="submit" disabled={isSubmitDisabled} className="w-full">
                            {(isPending || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Guardar Cambios' : 'Guardar Documento'}
                        </Button>
                    </div>

                </form>
            </Form>
        </div>
    );
}
