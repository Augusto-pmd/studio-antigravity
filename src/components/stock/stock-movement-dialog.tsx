'use client';

import { useState, useMemo, useEffect, ChangeEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import type {
  Consumable,
  StockMovement,
  UserProfile,
  Project,
  Supplier,
  Expense,
} from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

const supplierConverter = {
  toFirestore: (data: Supplier): DocumentData => data,
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier),
};

const userProfileConverter = {
  toFirestore: (data: UserProfile): DocumentData => data,
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile =>
    ({ ...snapshot.data(options), id: snapshot.id } as UserProfile),
};
const projectConverter = {
  toFirestore: (data: Project): DocumentData => data,
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project),
};

interface StockMovementDialogProps {
  item: Consumable;
  movementType: 'Ingreso' | 'Egreso';
  children: React.ReactNode;
}

export function StockMovementDialog({
  item,
  movementType,
  children,
}: StockMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { user, firestore } = useUser();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  // --- Purchase Flow States ---
  const [generateExpense, setGenerateExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseSupplierId, setExpenseSupplierId] = useState<string | undefined>();
  const [expenseProjectId, setExpenseProjectId] = useState<string | undefined>();
  const [expenseInvoiceNumber, setExpenseInvoiceNumber] = useState('');

  const suppliersQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'suppliers').withConverter(supplierConverter)
        : null,
    [firestore]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } =
    useCollection<Supplier>(suppliersQuery);

  const usersQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'users').withConverter(userProfileConverter)
        : null,
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<UserProfile>(usersQuery);

  const projectsQuery = useMemo(
    () =>
      firestore
        ? query(
          collection(firestore, 'projects').withConverter(projectConverter),
          where('status', '==', 'En Curso')
        )
        : null,
    [firestore]
  );
  const { data: projects, isLoading: isLoadingProjects } =
    useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setQuantity('');
    setAssigneeId(undefined);
    setProjectId(undefined);
    setNotes('');
    setGenerateExpense(false);
    setExpenseAmount('');
    setExpenseSupplierId(undefined);
    setExpenseProjectId(undefined);
    setExpenseInvoiceNumber('');
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleSave = async () => {
    if (!firestore || !user)
      return toast({ variant: 'destructive', title: 'Error de autenticación.' });

    const moveQuantity = parseInt(quantity, 10);
    if (isNaN(moveQuantity) || moveQuantity <= 0) {
      return toast({
        variant: 'destructive',
        title: 'Cantidad no válida',
        description: 'La cantidad debe ser un número mayor a cero.',
      });
    }

    setIsPending(true);
    try {
      const batch = writeBatch(firestore);
      const stockItemRef = doc(firestore, 'inventory_consumables', item.id);
      const movementRef = doc(
        collection(firestore, 'inventory_movements')
      );

      let newQuantity;
      let newMovement: Omit<StockMovement, 'id'>;

      if (movementType === 'Egreso') {
        if (moveQuantity > item.quantity) {
          toast({
            variant: 'destructive',
            title: 'Stock insuficiente',
            description: `No puede dar salida a más de ${item.quantity} unidades.`,
          });
          setIsPending(false);
          return;
        }
        if (!assigneeId || !projectId) {
          toast({
            variant: 'destructive',
            title: 'Campos requeridos',
            description:
              'Debe seleccionar un responsable y una obra para la salida.',
          });
          setIsPending(false);
          return;
        }

        newQuantity = item.quantity - moveQuantity;
        const selectedAssignee = users?.find(
          (u: UserProfile) => u.id === assigneeId
        );
        const selectedProject = projects?.find(
          (p: Project) => p.id === projectId
        );

        newMovement = {
          itemId: item.id,
          itemName: item.name,
          itemType: 'CONSUMABLE',
          type: 'CHECK_OUT',
          quantity: moveQuantity,
          date: new Date().toISOString(),
          authorizedBy: user.uid,
          to: selectedAssignee ? {
            type: 'EMPLOYEE',
            id: selectedAssignee.id,
            name: selectedAssignee.fullName,
          } : undefined,
          projectId: selectedProject?.id,
          projectName: selectedProject?.name,
          notes: notes || undefined,
        };
      } else {
        // Ingreso
        newQuantity = item.quantity + moveQuantity;
        newMovement = {
          itemId: item.id,
          itemName: item.name,
          itemType: 'CONSUMABLE',
          type: 'CHECK_IN', // Changed from 'Ingreso'
          quantity: moveQuantity,
          date: new Date().toISOString(),
          authorizedBy: user.uid,
          notes: notes || undefined,
        };

        if (generateExpense) {
          if (!expenseProjectId || !expenseSupplierId || !expenseAmount) {
            toast({
              variant: 'destructive',
              title: 'Campos requeridos',
              description: 'Complete Obra, Proveedor y Monto para generar la compra.',
            });
            setIsPending(false);
            return;
          }

          const parsedAmount = parseFloat(expenseAmount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({
              variant: 'destructive',
              title: 'Monto inválido',
              description: 'El monto de la compra debe ser mayor a cero.',
            });
            setIsPending(false);
            return;
          }

          const expenseRef = doc(collection(firestore, `projects/${expenseProjectId}/expenses`));
          const newExpense: Omit<Expense, 'id'> = {
            projectId: expenseProjectId,
            date: new Date().toISOString(),
            supplierId: expenseSupplierId,
            categoryId: 'CAT-01', // Materiales de Construcción por defecto para Pañol
            documentType: 'Factura',
            amount: parsedAmount,
            currency: 'ARS', // Default to ARS for now
            exchangeRate: 1, // Will be handled if currency evolves to USD
            paymentSource: 'Tesorería',
            status: 'Pendiente de Pago',
            description: `Compra de ${moveQuantity} ${item.unit} de ${item.name}${notes ? ` - ${notes}` : ''}`,
            invoiceNumber: expenseInvoiceNumber || undefined,
            iibbJurisdiction: 'No Aplica',
          };

          batch.set(expenseRef, newExpense);

          // Reference the expense in the movement
          newMovement.notes = newMovement.notes
            ? `${newMovement.notes} (Factura Auto-generada)`
            : `Factura Auto-generada para pago en Tesorería.`;
        }
      }

      batch.update(stockItemRef, {
        quantity: newQuantity,
        lastUpdated: new Date().toISOString(),
      });
      batch.set(movementRef, newMovement);

      await batch.commit();

      toast({
        title: 'Movimiento Registrado',
        description: `El stock de "${item.name}" ha sido actualizado.`,
      });
      setOpen(false);
    } catch (error) {
      console.error('Error committing batch:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo registrar el movimiento.',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Registrar {movementType === 'Ingreso' ? 'Entrada' : 'Salida'} de "
            {item.name}"
          </DialogTitle>
          <DialogDescription>
            {movementType === 'Ingreso'
              ? 'Registre la devolución o compra de nuevos ítems.'
              : 'Asigne este ítem a un responsable y una obra.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Alert variant="default" className="bg-muted">
            <AlertDescription className="flex justify-between items-center">
              <span>Stock Actual:</span>
              <span className="font-bold text-lg">
                {item.quantity} {item.unit}
              </span>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setQuantity(e.target.value)
              }
              placeholder="0"
            />
          </div>

          {movementType === 'Ingreso' && (
            <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Generar Factura de Compra
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envía el comprobante a Tesorería en estado Pendiente de Pago.
                  </p>
                </div>
                <Switch
                  checked={generateExpense}
                  onCheckedChange={setGenerateExpense}
                />
              </div>

              {generateExpense && (
                <div className="grid gap-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="exp-project">Obra a Imputar</Label>
                    <Select value={expenseProjectId} onValueChange={setExpenseProjectId} disabled={isLoadingProjects}>
                      <SelectTrigger id="exp-project"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                      <SelectContent>
                        {projects?.map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exp-supplier">Proveedor</Label>
                    <Select value={expenseSupplierId} onValueChange={setExpenseSupplierId} disabled={isLoadingSuppliers}>
                      <SelectTrigger id="exp-supplier"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((s: Supplier) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp-amount">Monto Total (ARS)</Label>
                      <Input id="exp-amount" type="number" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp-inv">Nº Comprobante</Label>
                      <Input id="exp-inv" placeholder="0001-00001234 (Opcional)" value={expenseInvoiceNumber} onChange={e => setExpenseInvoiceNumber(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {movementType === 'Egreso' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsable</Label>
                <Select
                  value={assigneeId}
                  onValueChange={setAssigneeId}
                  disabled={isLoadingUsers}
                >
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Asignar a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u: UserProfile) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Obra de Destino</Label>
                <Select
                  value={projectId}
                  onValueChange={setProjectId}
                  disabled={isLoadingProjects}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Seleccionar obra..." />
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
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
              placeholder="Ej: Herramienta nueva, devolución por final de obra..."
            />
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
