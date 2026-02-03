"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import type { Contractor, Project } from "@/lib/types";
import { useFirestore, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, setDoc, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};


export function ContractorDialog({
  contractor,
  children,
}: {
  contractor?: Contractor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!contractor;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const projectsQuery = useMemo(() => (
    firestore ? query(collection(firestore, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso')) : null
  ), [firestore]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  // Form State
  const [name, setName] = useState('');
  const [cuit, setCuit] = useState('');
  const [address, setAddress] = useState('');
  const [fiscalCondition, setFiscalCondition] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Aprobado' | 'Pendiente' | 'Rechazado'>('Pendiente');
  const [artExpiryDate, setArtExpiryDate] = useState<Date | undefined>();
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  
  const [budgets, setBudgets] = useState<{ [projectId: string]: { initial: string; additionals: { id: string; amount: string; description: string }[] } }>({});
  const [newBudgetAlloc, setNewBudgetAlloc] = useState<{projectId: string, initial: string} | null>(null);

  const resetForm = () => {
    setName(contractor?.name || '');
    setCuit(contractor?.cuit || '');
    setAddress(contractor?.address || '');
    setFiscalCondition(contractor?.fiscalCondition || '');
    setContactPerson(contractor?.contactPerson || '');
    setEmail(contractor?.email || '');
    setPhone(contractor?.phone || '');
    setStatus(contractor?.status || 'Pendiente');
    setArtExpiryDate(contractor?.artExpiryDate ? parseISO(contractor.artExpiryDate) : undefined);
    setInsuranceExpiryDate(contractor?.insuranceExpiryDate ? parseISO(contractor.insuranceExpiryDate) : undefined);
    setNotes(contractor?.notes || '');
    
    const initialBudgets: { [projectId: string]: { initial: string; additionals: { id: string; amount: string; description: string }[] } } = {};
    if (contractor?.budgets) {
        for (const projectId in contractor.budgets) {
            const projectBudget = contractor.budgets[projectId];
            initialBudgets[projectId] = {
                initial: projectBudget?.initial?.toString() || '',
                additionals: projectBudget?.additionals?.map(ad => ({
                    ...ad,
                    id: doc(collection(firestore!, 'dummy')).id, 
                    amount: ad.amount.toString(),
                })) || []
            };
        }
    }
    setBudgets(initialBudgets);
    setNewBudgetAlloc(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, contractor]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!name || !cuit || !status) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Razón Social, CUIT y Estado son obligatorios.' });
      return;
    }

    startTransition(() => {
        const contractorsCollection = collection(firestore, 'contractors');
        const contractorRef = isEditMode ? doc(contractorsCollection, contractor.id) : doc(contractorsCollection);
        const contractorId = contractorRef.id;

        const contractorData: Partial<Contractor> = {
            id: contractorId,
            name,
            cuit,
            address,
            fiscalCondition,
            contactPerson,
            email,
            phone,
            status,
            notes,
            budgets: Object.entries(budgets).reduce((acc, [projectId, budgetData]) => {
                const initial = parseFloat(budgetData.initial);
                const additionals = budgetData.additionals
                    .map(ad => ({
                        amount: parseFloat(ad.amount) || 0,
                        description: ad.description
                    }))
                    .filter(ad => ad.amount > 0);

                const budgetEntry: { initial?: number, additionals?: { amount: number; description: string }[] } = {};
                if (!isNaN(initial) && initial > 0) budgetEntry.initial = initial;
                if (additionals.length > 0) budgetEntry.additionals = additionals;
                
                if (Object.keys(budgetEntry).length > 0) {
                    acc[projectId] = budgetEntry;
                }
                return acc;
            }, {} as Exclude<Contractor['budgets'], undefined>),
        };

        if (artExpiryDate) {
            contractorData.artExpiryDate = artExpiryDate.toISOString();
        }
        if (insuranceExpiryDate) {
            contractorData.insuranceExpiryDate = insuranceExpiryDate.toISOString();
        }
        
        setDoc(contractorRef, contractorData, { merge: true })
            .then(() => {
                toast({
                    title: isEditMode ? 'Contratista Actualizado' : 'Contratista Creado',
                    description: `El contratista "${name}" ha sido guardado correctamente.`,
                });
                setOpen(false);
            })
            .catch((error) => {
                console.error("Error writing to Firestore:", error);
                toast({ variant: 'destructive', title: 'Error al guardar', description: "No se pudo guardar el contratista. Es posible que no tengas permisos." });
            });
    });
  };

    const handleAddProjectBudget = () => {
        if (newBudgetAlloc && newBudgetAlloc.projectId && newBudgetAlloc.initial) {
        setBudgets(prev => ({
            ...prev,
            [newBudgetAlloc.projectId]: {
            initial: newBudgetAlloc.initial,
            additionals: []
            }
        }));
        setNewBudgetAlloc(null);
        }
    };

    const handleRemoveProjectBudget = (projectId: string) => {
        setBudgets(prev => {
        const newBudgets = { ...prev };
        delete newBudgets[projectId];
        return newBudgets;
        });
    };

    const handleAddAdditional = (projectId: string) => {
        setBudgets(prev => ({
        ...prev,
        [projectId]: {
            ...prev[projectId],
            additionals: [
            ...(prev[projectId]?.additionals || []),
            { id: doc(collection(firestore!, 'dummy')).id, amount: '', description: '' }
            ]
        }
        }));
    };
    
    const handleRemoveAdditional = (projectId: string, additionalId: string) => {
        setBudgets(prev => ({
        ...prev,
        [projectId]: {
            ...prev[projectId],
            additionals: prev[projectId].additionals.filter(ad => ad.id !== additionalId)
        }
        }));
    };
    
    const handleBudgetChange = (projectId: string, field: 'initial', value: string) => {
        setBudgets(prev => ({
        ...prev,
        [projectId]: { ...prev[projectId], [field]: value }
        }));
    };

    const handleAdditionalChange = (projectId: string, additionalId: string, field: 'amount' | 'description', value: string) => {
        setBudgets(prev => ({
        ...prev,
        [projectId]: {
            ...prev[projectId],
            additionals: prev[projectId].additionals.map(ad => 
            ad.id === additionalId ? { ...ad, [field]: value } : ad
            )
        }
        }));
    };

    const getProjectName = (projectId: string) => {
        return projects?.find(p => p.id === projectId)?.name || 'Obra desconocida';
    }
  
    const unassignedProjects = projects?.filter(p => !Object.keys(budgets).includes(p.id)) || [];


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Contratista' : 'Alta de Nuevo Contratista'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del contratista.' : 'Complete el formulario para registrar un nuevo contratista. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 pl-1 py-4 grid gap-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Identificación y Ubicación</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Razón Social *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre o Razón Social" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input id="cuit" value={cuit} onChange={e => setCuit(e.target.value)} placeholder="00-00000000-0" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección completa del contratista" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="fiscalCondition">Condición Fiscal</Label>
                <Input id="fiscalCondition" value={fiscalCondition} onChange={e => setFiscalCondition(e.target.value)} placeholder="Ej. Responsable Inscripto" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Persona de Contacto</Label>
                <Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contratista.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Código de área y número" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Estado y Documentación</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado del Contratista *</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente de Aprobación</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="artExpiryDate">Vencimiento ART</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !artExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {artExpiryDate ? format(artExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={artExpiryDate} onSelect={setArtExpiryDate} locale={es} /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiryDate">Vencimiento Seguro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !insuranceExpiryDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {insuranceExpiryDate ? format(insuranceExpiryDate, "PPP", { locale: es }) : <span>Opcional</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={insuranceExpiryDate} onSelect={setInsuranceExpiryDate} locale={es} /></PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Presupuestos por Obra</h4>
                {Object.entries(budgets).map(([projectId, budgetData]) => (
                    <Card key={projectId}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                {getProjectName(projectId)}
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveProjectBudget(projectId)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`initial-${projectId}`}>Presupuesto Inicial</Label>
                                <Input id={`initial-${projectId}`} type="number" placeholder="Monto inicial" value={budgetData.initial} onChange={(e) => handleBudgetChange(projectId, 'initial', e.target.value)} />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label>Adicionales</Label>
                                {budgetData.additionals.length === 0 && <p className="text-xs text-muted-foreground">No hay adicionales para esta obra.</p>}
                                {budgetData.additionals.map(ad => (
                                    <div key={ad.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                                        <Input type="text" placeholder="Descripción del adicional" value={ad.description} onChange={e => handleAdditionalChange(projectId, ad.id, 'description', e.target.value)} />
                                        <Input type="number" placeholder="Monto" value={ad.amount} onChange={e => handleAdditionalChange(projectId, ad.id, 'amount', e.target.value)} className="w-32" />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAdditional(projectId, ad.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => handleAddAdditional(projectId)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Adicional
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle>Asignar Presupuesto a Nueva Obra</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Obra</Label>
                            <Select 
                                value={newBudgetAlloc?.projectId || ''} 
                                onValueChange={pid => setNewBudgetAlloc(prev => ({...(prev || {initial: ''}), projectId: pid}))}
                                disabled={isLoadingProjects || unassignedProjects.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={unassignedProjects.length > 0 ? "Seleccionar obra" : "No hay más obras para asignar"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {unassignedProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Presupuesto Inicial</Label>
                            <Input 
                                type="number" 
                                placeholder="Monto inicial" 
                                value={newBudgetAlloc?.initial || ''}
                                onChange={e => setNewBudgetAlloc(prev => ({...(prev || {projectId: ''}), initial: e.target.value}))}
                                disabled={!newBudgetAlloc?.projectId}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleAddProjectBudget} disabled={!newBudgetAlloc?.projectId || !newBudgetAlloc?.initial}>
                            Asignar Presupuesto
                        </Button>
                    </CardFooter>
                </Card>
          </div>

          <Separator />
          
          <div className="space-y-2">
             <Label htmlFor="notes">Notas y Observaciones</Label>
             <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cualquier información adicional sobre el contratista..." />
          </div>

        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Contratista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
