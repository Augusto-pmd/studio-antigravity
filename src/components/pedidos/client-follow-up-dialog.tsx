'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useUser, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import type { UserProfile, ClientFollowUp } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const userProfileConverter = {
  toFirestore: (data: UserProfile): DocumentData => data,
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile =>
    ({ ...snapshot.data(options), id: snapshot.id } as UserProfile),
};

const channels: ClientFollowUp['channel'][] = ['Llamada', 'Email', 'Reunión', 'WhatsApp', 'Otro'];
const statuses: ClientFollowUp['status'][] = ['Primer Contacto', 'En Seguimiento', 'Propuesta Enviada', 'En Negociación', 'Cerrado - Ganado', 'Cerrado - Perdido', 'Stand-by'];

export function ClientFollowUpDialog({
  followUp,
  children,
}: {
  followUp?: ClientFollowUp;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!followUp;
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const [clientName, setClientName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactDate, setContactDate] = useState<Date | undefined>();
  const [channel, setChannel] = useState<ClientFollowUp['channel'] | undefined>();
  const [status, setStatus] = useState<ClientFollowUp['status'] | undefined>();
  const [summary, setSummary] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextContactDate, setNextContactDate] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState('');
  
  const directorsQuery = useMemo(() => firestore ? query(collection(firestore, 'users').withConverter(userProfileConverter), where('role', '==', 'Dirección')) : null, [firestore]);
  const { data: directors, isLoading: isLoadingDirectors } = useCollection<UserProfile>(directorsQuery);

  const resetForm = () => {
    setClientName(followUp?.clientName || '');
    setContactPerson(followUp?.contactPerson || '');
    setContactDate(followUp?.contactDate ? parseISO(followUp.contactDate) : new Date());
    setChannel(followUp?.channel);
    setStatus(followUp?.status);
    setSummary(followUp?.summary || '');
    setNextStep(followUp?.nextStep || '');
    setNextContactDate(followUp?.nextContactDate ? parseISO(followUp.nextContactDate) : undefined);
    setAssignedTo(followUp?.assignedTo || user?.uid || '');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, followUp, user]);

  const handleSave = () => {
    if (!firestore || !user) return;
    if (!clientName || !contactDate || !channel || !status || !summary || !assignedTo) {
      return toast({ variant: 'destructive', title: 'Campos obligatorios', description: 'Por favor, complete todos los campos requeridos.' });
    }

    startTransition(() => {
      const collectionRef = collection(firestore, 'clientFollowUps');
      const docRef = isEditMode ? doc(collectionRef, followUp.id) : doc(collectionRef);
      const assignedUser = directors?.find(d => d.id === assignedTo);

      if (!assignedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'El usuario asignado no es válido.' });
        return;
      }
      
      const data: ClientFollowUp = {
        id: docRef.id,
        clientName,
        contactPerson: contactPerson || undefined,
        contactDate: contactDate.toISOString(),
        channel,
        status,
        summary,
        nextStep: nextStep || undefined,
        nextContactDate: nextContactDate?.toISOString(),
        assignedTo: assignedUser.id,
        assignedToName: assignedUser.fullName,
      };

      setDoc(docRef, data, { merge: true })
        .then(() => {
          toast({ title: isEditMode ? 'Seguimiento Actualizado' : 'Seguimiento Creado', description: 'El registro ha sido guardado correctamente.' });
          setOpen(false);
        })
        .catch(error => {
          console.error("Error writing document:", error);
          toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el registro.' });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Seguimiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Seguimiento de Cliente' : 'Nuevo Seguimiento de Cliente'}</DialogTitle>
          <DialogDescription>
            Registre una nueva interacción o actualice el estado de un cliente potencial.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del Cliente/Empresa</Label>
              <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Persona de Contacto</Label>
              <Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="(Opcional)" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactDate">Fecha de Contacto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !contactDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {contactDate ? format(contactDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={contactDate} onSelect={setContactDate} initialFocus locale={es} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={channel} onValueChange={(v: ClientFollowUp['channel']) => setChannel(v)}>
                <SelectTrigger id="channel"><SelectValue placeholder="Seleccionar canal" /></SelectTrigger>
                <SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Resumen de la Interacción</Label>
            <Textarea id="summary" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Resuma lo conversado, puntos clave, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado Actual</Label>
            <Select value={status} onValueChange={(v: ClientFollowUp['status']) => setStatus(v)}>
              <SelectTrigger id="status"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextStep">Próximo Paso</Label>
            <Input id="nextStep" value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Ej. Enviar propuesta, Llamar para confirmar" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nextContactDate">Próxima Fecha de Contacto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nextContactDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextContactDate ? format(nextContactDate, "PPP", { locale: es }) : <span>(Opcional)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={nextContactDate} onSelect={setNextContactDate} initialFocus locale={es} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Responsable</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isLoadingDirectors}>
                <SelectTrigger id="assignedTo"><SelectValue placeholder="Asignar a..." /></SelectTrigger>
                <SelectContent>{directors?.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Seguimiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
