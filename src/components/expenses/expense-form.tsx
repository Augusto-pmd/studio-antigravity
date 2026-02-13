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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [selectedProject, setSelectedProject] = useState(defaultProjectId || '');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
    const [paymentSource, setPaymentSource] = useState<'Tesorería' | 'Caja Chica'>('Tesorería');
    const [documentType, setDocumentType] = useState<'Factura' | 'Recibo Común' | 'Nota de Crédito'>('Factura');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [amount, setAmount] = useState('');
    const [iva, setIva] = useState('');
    const [iibb, setIibb] = useState('');
    const [iibbJurisdiction, setIibbJurisdiction] = useState<'No Aplica' | 'CABA' | 'Provincia'>('No Aplica');
    const [exchangeRate, setExchangeRate] = useState('');

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

    const project = useMemo(() => projects?.find((p: Project) => p.id === selectedProject), [selectedProject, projects]);
    const supplier = useMemo(() => suppliers?.find((s: Supplier) => s.id === selectedSupplier), [selectedSupplier, suppliers]);

    const isContractBlocked = project?.balance === 0;

    const isSupplierBlocked = useMemo(() => {
        if (!supplier) return false;
        const today = new Date().toISOString().split('T')[0];

        if (supplier.insuranceExpiryDate && supplier.insuranceExpiryDate < today) return true;
        if (supplier.artExpiryDate && supplier.artExpiryDate < today) return true;

        return false;
    }, [supplier]);

    const resetForm = () => {
        setSelectedProject(defaultProjectId || expense?.projectId || '');
        setSelectedSupplier(expense?.supplierId || '');
        setSelectedCategory(expense?.categoryId || '');
        setDescription(expense?.description || '');
        setDate(expense?.date ? parseISO(expense.date) : new Date());
        setCurrency(expense?.currency || 'ARS');
        setPaymentSource(expense?.paymentSource || 'Tesorería');
        setDocumentType(expense?.documentType || 'Factura');
        setInvoiceNumber(expense?.invoiceNumber || '');
        setFile(null);
        setAmount(expense?.amount?.toString() || '');
        setIva(expense?.iva?.toString() || '');
        setIibb(expense?.iibb?.toString() || '');
        setIibbJurisdiction(expense?.iibbJurisdiction || 'No Aplica');
        setExchangeRate(expense?.exchangeRate?.toString() || '');
        setRetencionGanancias(expense?.retencionGanancias?.toString() || '');
        setRetencionIVA(expense?.retencionIVA?.toString() || '');
        setRetencionIIBB(expense?.retencionIIBB?.toString() || '');
        setRetencionSUSS(expense?.retencionSUSS?.toString() || '');
    };

    // Auto-fetch historical exchange rate when date changes
    useEffect(() => {
        if (date) {
            const fetchRate = async () => {
                // Show some loading state if needed, or just let it pop in
                const rate = await getHistoricalRate(date);
                if (rate > 0) {
                    setExchangeRate(rate.toString());
                }
            };
            fetchRate();
        }
    }, [date]);

    useEffect(() => {
        resetForm();
    }, [expense, defaultProjectId]);

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

            if (extractedData.amount) setAmount(extractedData.amount.toString());
            // Note: API returns total amount, we can try to guess IVA if needed, but for now just set Amount.
            // if (extractedData.iva) setIva(extractedData.iva.toString()); 

            if (extractedData.invoiceNumber) setInvoiceNumber(extractedData.invoiceNumber);

            if (extractedData.date) {
                // API returns YYYY-MM-DD
                const [year, month, day] = extractedData.date.split('-').map(Number);
                const utcDate = new Date(year, month - 1, day);
                setDate(utcDate);
            }

            if (extractedData.currency) {
                setCurrency(extractedData.currency as 'ARS' | 'USD');
            }

            let matchedSupplier: Supplier | undefined;

            if (extractedData.supplierCuit && suppliers) {
                matchedSupplier = suppliers.find((s: Supplier) => s.cuit?.replace(/-/g, '') === extractedData.supplierCuit!.replace(/-/g, ''));
                if (matchedSupplier) {
                    setSelectedSupplier(matchedSupplier.id);
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
                    setSelectedSupplier(matchedSupplier.id);
                    toast({ title: 'Proveedor Encontrado', description: `Se ha seleccionado a "${matchedSupplier.name}" por Nombre.` });
                }
            }

            if (extractedData.category) {
                // Simple keyword matching for category
                const categoryName = extractedData.category.toLowerCase();
                const matchedCategory = expenseCategories.find(c => c.name.toLowerCase().includes(categoryName));
                if (matchedCategory) {
                    setSelectedCategory(matchedCategory.id);
                }
            } else if (matchedSupplier) {
                // Auto-fill category based on Supplier Type
                if (matchedSupplier.type === 'Materiales') setSelectedCategory('CAT-01'); // Materiales de Construcción
                else if (matchedSupplier.type === 'Servicios') setSelectedCategory('CAT-15'); // Servicios
                else if (matchedSupplier.type === 'Mixto') setSelectedCategory('CAT-12'); // Otros
            }

            // Auto-fill Document Type based on fiscal condition if not detected
            if (matchedSupplier) {
                if (matchedSupplier.fiscalCondition === 'Responsable Inscripto' || matchedSupplier.fiscalCondition === 'Monotributo') {
                    setDocumentType('Factura');
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

    const handleSaveExpense = () => {
        if (!selectedProject || !date || !selectedSupplier || !amount || !selectedCategory || !exchangeRate) {
            toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor, complete todos los campos obligatorios, incluyendo el tipo de cambio.' });
            return;
        }
        if ((documentType === 'Factura' || documentType === 'Nota de Crédito') && !invoiceNumber) {
            toast({ variant: 'destructive', title: 'Nº de Comprobante requerido', description: 'El número de factura o nota de crédito es obligatorio.' });
            return;
        }

        if (!firestore || !user || !firebaseApp) {
            toast({ variant: 'destructive', title: 'Error', description: "Firebase no está disponible." });
            return;
        }

        startTransition(() => {
            setIsSaving(true);
            const saveData = async () => {
                const projectId = isEditMode && expense ? expense.projectId : selectedProject;
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
                    date: date.toISOString(),
                    supplierId: selectedSupplier,
                    categoryId: selectedCategory,
                    documentType,
                    amount: parseFloat(amount) || 0,
                    currency,
                    paymentSource,
                    exchangeRate: parseFloat(exchangeRate) || 0,
                    status: isEditMode ? expense.status : 'Pendiente de Pago',
                };

                if (description) expenseData.description = description;
                if (receiptUrl) expenseData.receiptUrl = receiptUrl;

                if (documentType === 'Factura' || documentType === 'Nota de Crédito') {
                    expenseData.invoiceNumber = invoiceNumber;
                    expenseData.iibbJurisdiction = iibbJurisdiction;
                    const parsedIva = parseOptionalFloat(iva);
                    if (parsedIva !== undefined) expenseData.iva = parsedIva;
                    const parsedIibb = parseOptionalFloat(iibb);
                    if (parsedIibb !== undefined) expenseData.iibb = parsedIibb;
                } else {
                    expenseData.iibbJurisdiction = 'No Aplica';
                }

                const parsedRetG = parseOptionalFloat(retencionGanancias);
                if (parsedRetG !== undefined) expenseData.retencionGanancias = parsedRetG;
                const parsedRetIva = parseOptionalFloat(retencionIVA);
                if (parsedRetIva !== undefined) expenseData.retencionIVA = parsedRetIva;
                const parsedRetIibb = parseOptionalFloat(retencionIIBB);
                if (parsedRetIibb !== undefined) expenseData.retencionIIBB = parsedRetIibb;
                const parsedRetSuss = parseOptionalFloat(retencionSUSS);
                if (parsedRetSuss !== undefined) expenseData.retencionSUSS = parsedRetSuss;

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
    };

    const isSubmitDisabled = isPending || isSaving || isContractBlocked || isSupplierBlocked || !selectedProject || !selectedSupplier || !selectedCategory || !amount || !exchangeRate || ((documentType === 'Factura' || documentType === 'Nota de Crédito') && !invoiceNumber);

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

            <div className="space-y-2">
                <Label htmlFor="project">Obra</Label>
                <Select onValueChange={setSelectedProject} value={selectedProject} disabled={!!defaultProjectId || isEditMode || isLoadingProjects}>
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
                        {suppliers?.map((s: Supplier) => (
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
                        {expenseCategories.map((c: { id: string; name: string }) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Vía Contable / Origen del Pago</Label>
                <RadioGroup
                    value={paymentSource}
                    onValueChange={(v: 'Tesorería' | 'Caja Chica') => setPaymentSource(v)}
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
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Añada un detalle sobre el gasto"
                />
            </div>
            <div className="space-y-2">
                <Label>Tipo Comprobante</Label>
                <RadioGroup
                    value={documentType}
                    onValueChange={(value: 'Factura' | 'Recibo Común' | 'Nota de Crédito') => setDocumentType(value)}
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
            </div>

            {(documentType === 'Factura' || documentType === 'Nota de Crédito') && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="receipt">Comprobante</Label>
                        <div className="flex items-center gap-2">
                            <Input id="receipt" type="file" onChange={handleFileChange} className="flex-1" accept=".pdf,.jpg,.jpeg,.png,.heic" />
                            {isEditMode && expense?.receiptUrl && (
                                <Button asChild variant="outline" size="icon">
                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="h-4 w-4" /></a>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invoiceNumber">Nº Comprobante</Label>
                        <div className="relative">
                            <Input id="invoiceNumber" type="text" placeholder="Nº de la factura o nota de crédito" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
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
                <Label htmlFor="exchangeRate">Tipo de Cambio *</Label>
                <Input
                    id="exchangeRate"
                    type="number"
                    placeholder="Dólar BNA compra"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    readOnly={!permissions.canSupervise}
                    className={cn("bg-muted", permissions.canSupervise && "bg-background")}
                />
                <p className="text-xs text-muted-foreground">
                    {permissions.canSupervise
                        ? "Calculado automáticamente. Puede editarlo manualmente."
                        : "Calculado automáticamente segun fecha. Solo Dirección puede modificarlo."}
                </p>
            </div>

            {(documentType === 'Factura' || documentType === 'Nota de Crédito') && (
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
                </>
            )}

            <Separator />

            <div className="space-y-2">
                <Label htmlFor="amount" className="text-lg">Monto Total</Label>
                <div className="relative">
                    <Input id="amount" type="number" placeholder="0.00" className="text-lg h-12" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
            </div>

            <div className="mt-4">
                <Button type="button" onClick={handleSaveExpense} disabled={isSubmitDisabled} className="w-full">
                    {(isPending || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Guardar Cambios' : 'Guardar Documento'}
                </Button>
            </div>

        </div>
    );
}
