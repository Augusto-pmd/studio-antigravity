'use client';

import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, writeBatch, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { StockItem, StockMovement, UserProfile, Project } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

const userProfileConverter = {
    toFirestore: (data: UserProfile): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile => ({ ...snapshot.data(options), id: snapshot.id } as UserProfile)
};
const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

interface StockMovementDialogProps {
  item: StockItem;
  movementType: 'Ingreso' | 'Egreso';
  children: React.ReactNode;
}

export function StockMovementDialog({ item, movementType, children }: StockMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users').withConverter(userProfileConverter) : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const projectsQuery = useMemo(() => (firestore ? query(collection(firestore, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso')) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setQuantity('');
    setAssigneeId(undefined);
    setProjectId(undefined);
    setNotes('');
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleSave = async () => {
    if (!firestore || !user) return toast({ variant: 'destructive', title: 'Error de autenticación.' });
    
    const moveQuantity = parseInt(quantity, 10);
    if (isNaN(moveQuantity) || moveQuantity <= 0) {
      return toast({ variant: 'destructive', title: 'Cantidad no válida', description: 'La cantidad debe ser un número mayor a cero.' });
    }
    
    setIsPending(true);
    try {
        const batch = writeBatch(firestore);
        const stockItemRef = doc(firestore, 'stockItems', item.id);
        const movementRef = doc(collection(firestore, `stockItems/${item.id}/movements`));
        
        let newQuantity;
        let newMovement: Omit<StockMovement, 'id'>;

        if (movementType === 'Egreso') {
            if (moveQuantity > item.quantity) {
                toast({ variant: 'destructive', title: 'Stock insuficiente', description: `No puede dar salida a más de ${item.quantity} unidades.` });
                setIsPending(false);
                return;
            }
            if (!assigneeId || !projectId) {
                toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Debe seleccionar un responsable y una obra para la salida.' });
                setIsPending(false);
                return;
            }

            newQuantity = item.quantity - moveQuantity;
            const selectedAssignee = users?.find((u: UserProfile) => u.id === assigneeId);
            const selectedProject = projects?.find((p: Project) => p.id === projectId);

            newMovement = {
                itemId: item.id,
                type: 'Egreso',
                quantity: moveQuantity,
                date: new Date().toISOString(),
                userId: user.uid,
                assigneeId: selectedAssignee?.id,
                assigneeName: selectedAssignee?.fullName,
                projectId: selectedProject?.id,
                projectName: selectedProject?.name,
                notes: notes || undefined,
            };

        } else { // Ingreso
            newQuantity = item.quantity + moveQuantity;
            newMovement = {
                itemId: item.id,
                type: 'Ingreso',
                quantity: moveQuantity,
                date: new Date().toISOString(),
                userId: user.uid,
                notes: notes || undefined,
            };
        }
        
        batch.update(stockItemRef, {
            quantity: newQuantity,
            lastUpdated: new Date().toISOString(),
        });
        batch.set(movementRef, newMovement);

        await batch.commit();

        toast({ title: 'Movimiento Registrado', description: `El stock de "${item.name}" ha sido actualizado.` });
        setOpen(false);

    } catch (error) {
        console.error("Error committing batch:", error);
        toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo registrar el movimiento.' });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar {movementType === 'Ingreso' ? 'Entrada' : 'Salida'} de "{item.name}"</DialogTitle>
          <DialogDescription>
            {movementType === 'Ingreso' ? 'Registre la devolución o compra de nuevos ítems.' : 'Asigne este ítem a un responsable y una obra.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Alert variant="default" className="bg-muted">
            <AlertDescription className="flex justify-between items-center">
              <span>Stock Actual:</span>
              <span className="font-bold text-lg">{item.quantity} {item.unit}</span>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input id="quantity" type="number" value={quantity} onChange={(e: any) => setQuantity(e.target.value)} placeholder="0" />
          </div>
          {movementType === 'Egreso' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsable</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isLoadingUsers}>
                  <SelectTrigger id="assignee"><SelectValue placeholder="Asignar a..." /></SelectTrigger>
                  <SelectContent>
                    {users?.map((u: UserProfile) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Obra de Destino</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={isLoadingProjects}>
                  <SelectTrigger id="project"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                  <SelectContent>
                    {projects?.map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Ej: Herramienta nueva, devolución por final de obra..." />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar {movementType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
