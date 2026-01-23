"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Loader2 } from "lucide-react";
import type { TechnicalOfficeEmployee, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc } from "firebase/firestore";

export function TechnicalOfficeEmployeeDialog({
  employee,
  children,
}: {
  employee?: TechnicalOfficeEmployee;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!employee;
  const [isPending, startTransition] = useTransition();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [userId, setUserId] = useState('');
  const [position, setPosition] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const techOfficeEmployeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'technicalOfficeEmployees') : null), [firestore]);
  const { data: techOfficeEmployees } = useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

  const availableUsers = users?.filter(u => 
    !techOfficeEmployees?.some(toe => toe.userId === u.id) || (isEditMode && employee.userId === u.id)
  ) || [];

  const resetForm = () => {
    setUserId(employee?.userId || '');
    setPosition(employee?.position || '');
    setMonthlySalary(employee?.monthlySalary?.toString() || '');
    setStatus(employee?.status || 'Activo');
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, employee]);

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (!userId || !position || !monthlySalary) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Empleado, Cargo y Salario son obligatorios.' });
      return;
    }

    startTransition(() => {
      const selectedUser = users?.find(u => u.id === userId);
      if (!selectedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'El usuario seleccionado no es válido.' });
        return;
      }
      
      const employeeRef = doc(firestore, 'technicalOfficeEmployees', userId);

      const employeeData: TechnicalOfficeEmployee = {
        id: userId,
        userId,
        fullName: selectedUser.fullName,
        position,
        monthlySalary: parseFloat(monthlySalary) || 0,
        status,
      };
      
      setDocumentNonBlocking(employeeRef, employeeData, { merge: true });

      toast({
        title: isEditMode ? 'Empleado Actualizado' : 'Empleado Creado',
        description: `Los datos de ${selectedUser.fullName} han sido guardados.`,
      });
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Empleado de Oficina' : 'Nuevo Empleado de Oficina'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique la información del empleado.' : 'Complete el formulario para registrar un nuevo empleado de la oficina técnica.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Empleado</Label>
            <Select onValueChange={setUserId} value={userId} disabled={isLoadingUsers || isEditMode}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Seleccione un usuario" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Input id="position" value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej. Proyectista, Jefe de Compras" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">Salario Mensual (ARS)</Label>
            <Input id="monthlySalary" type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger id="status">
                <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Guardar Empleado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
