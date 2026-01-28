"use client";

import { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, doc, setDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project, FundRequest } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const fundRequestCategories = [
    'Logística y PMD',
    'Materiales',
    'Viáticos',
    'Caja Chica',
    'Otros',
];

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function RequestFundDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { user, firestore } = useUser();
  const { toast } = useToast();

  // Form State
  const [date, setDate] = useState<Date | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [description, setDescription] = useState('');

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setDate(new Date());
    setCategory(undefined);
    setProjectId(undefined);
    setCurrency('ARS');
    setAmount('');
    setExchangeRate('');
    setDescription('');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSave = async () => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'No está autenticado o hay un problema de conexión.' });
        return;
    }
    if (!category || !amount || !exchangeRate || !date) {
        toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Categoría, Monto, Tipo de Cambio y Fecha son obligatorios.' });
        return;
    }

    setIsPending(true);
    try {
      const selectedProject = projects?.find(p => p.id === projectId);

      const fundRequestsCollection = collection(firestore, 'fundRequests');
      const requestRef = doc(fundRequestsCollection);
      const requestId = requestRef.id;

      const requestData: FundRequest = {
          id: requestId,
          requesterId: user.uid,
          requesterName: user.displayName || 'Usuario Anónimo',
          date: date.toISOString(),
          category: category as FundRequest['category'],
          projectId: projectId,
          projectName: selectedProject?.name,
          amount: parseFloat(amount),
          currency,
          exchangeRate: parseFloat(exchangeRate),
          status: 'Pendiente',
          description: description || undefined,
      };

      await setDoc(requestRef, requestData);
      
      toast({
          title: 'Solicitud Enviada',
          description: 'Tu solicitud de fondos ha sido registrada y está pendiente de aprobación.',
      });
      resetForm();
      setOpen(false);

    } catch (error) {
        console.error("Error writing to Firestore:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudo enviar la solicitud. Es posible que no tengas permisos.",
        });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Solicitar Dinero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Fondos</DialogTitle>
          <DialogDescription>
            Complete el formulario para crear una nueva solicitud de fondos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

            <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccione una categoría" />
                </SelectTrigger>
                <SelectContent>
                    {fundRequestCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                        {c}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="project">Obra (Opcional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project">
                    <SelectValue placeholder="Imputar a una obra" />
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
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Añada un detalle o motivo para la solicitud." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn( "w-full justify-start text-left font-normal", !date && "text-muted-foreground" )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={es} initialFocus />
                </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <Label>Moneda</Label>
                <RadioGroup 
                    value={currency}
                    onValueChange={(value) => setCurrency(value as 'ARS' | 'USD')}
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
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}/>
            </div>

            <div className="space-y-2">
                <Label htmlFor="exchangeRate">Tipo de Cambio</Label>
                <Input id="exchangeRate" type="number" placeholder="Dólar BNA compra" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
