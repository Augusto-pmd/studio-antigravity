'use client';

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useUser, useCollection } from '@/firebase';
import { collection, doc, updateDoc, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Contractor, Project, ContractorCertification } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const contractorConverter = {
    toFirestore: (data: Contractor): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contractor => ({ ...snapshot.data(options), id: snapshot.id } as Contractor)
};
const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function EditContractorCertificationDialog({ certification, children }: { certification: ContractorCertification, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { firestore } = useUser();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  // FORM STATE
  const [contractorId, setContractorId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [notes, setNotes] = useState('');

  // DATA FETCHING
  const contractorsQuery = useMemo(() => firestore ? query(collection(firestore, 'contractors').withConverter(contractorConverter), where('status', '==', 'Aprobado')) : null, [firestore]);
  const { data: contractors, isLoading: isLoadingContractors } = useCollection<Contractor>(contractorsQuery);

  const projectsQuery = useMemo(() => firestore ? query(collection(firestore, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso')) : null, [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setContractorId(certification.contractorId);
    setProjectId(certification.projectId);
    setAmount(certification.amount.toString());
    setCurrency(certification.currency);
    setNotes(certification.notes || '');
  };
  
  useEffect(() => {
    if (open) resetForm();
  }, [open, certification]);

  const handleSave = async () => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Error de conexión.' });
        return;
    }
    if (!contractorId || !projectId || !amount) {
        toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Contratista, Obra y Monto son obligatorios.' });
        return;
    }
    
    const selectedContractor = contractors?.find(c => c.id === contractorId);
    const selectedProject = projects?.find(p => p.id === projectId);

    if (!selectedContractor || !selectedProject) {
        toast({ variant: 'destructive', title: 'Error', description: 'Contratista o Proyecto no válido.' });
        return;
    }

    setIsPending(true);
    try {
        const certRef = doc(firestore, 'contractorCertifications', certification.id);
        
        const updatedData: Partial<ContractorCertification> = {
            contractorId,
            contractorName: selectedContractor.name,
            projectId,
            projectName: selectedProject.name,
            amount: parseFloat(amount) || 0,
            currency,
            notes: notes || undefined,
        };

        await updateDoc(certRef, updatedData);
        
        toast({
            title: 'Certificación Actualizada',
            description: `Se ha guardado la certificación para ${selectedContractor.name}.`,
        });
        setOpen(false);
    } catch (error) {
        console.error("Error updating Firestore:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudo actualizar la certificación. Es posible que no tengas permisos.",
        });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Certificación de Contratista</DialogTitle>
          <DialogDescription>
            Modifique los detalles de la certificación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contractor">Contratista</Label>
            <Select onValueChange={setContractorId} value={contractorId} disabled={isLoadingContractors}>
              <SelectTrigger id="contractor"><SelectValue placeholder="Seleccione un contratista" /></SelectTrigger>
              <SelectContent>
                {contractors?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setProjectId} value={projectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
              <SelectContent>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Moneda</Label>
            <RadioGroup value={currency} onValueChange={(v: any) => setCurrency(v)} className="flex items-center gap-6 pt-1">
                <div className="flex items-center space-x-2"><RadioGroupItem value="ARS" id="ars-edit" /><Label htmlFor="ars-edit">ARS</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="USD" id="usd-edit" /><Label htmlFor="usd-edit">USD</Label></div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Certificar</Label>
            <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" placeholder="Detalle de los trabajos certificados (opcional)" value={notes} onChange={e => setNotes(e.target.value)}/>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
