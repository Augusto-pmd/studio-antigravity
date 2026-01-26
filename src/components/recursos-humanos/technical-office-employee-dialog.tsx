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
import { Loader2 } from "lucide-react";
import type { TechnicalOfficeEmployee, UserProfile, SalaryHistory } from "@/lib/types";
import { useFirestore, useCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, writeBatch, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";

const userProfileConverter = {
    toFirestore: (data: UserProfile): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile => ({ ...snapshot.data(options), id: snapshot.id } as UserProfile)
};

const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => ({ ...snapshot.data(options), id: snapshot.id } as TechnicalOfficeEmployee)
};

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
  const [employmentType, setEmploymentType] = useState<'Relación de Dependencia' | 'Monotributo'>('Relación de Dependencia');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');

  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users').withConverter(userProfileConverter) : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const techOfficeEmployeesQuery = useMemo(() => (firestore ? collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter) : null), [firestore]);
  const { data: techOfficeEmployees } = useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

  const availableUsers = users?.filter(u => 
    !techOfficeEmployees?.some(toe => toe.userId === u.id) || (isEditMode && employee.userId === u.id)
  ) || [];

  const resetForm = () => {
    setUserId(employee?.userId || '');
    setPosition(employee?.position || '');
    setEmploymentType(employee?.employmentType || 'Relación de Dependencia');
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
    if (!userId || !position || !monthlySalary || !employmentType) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Empleado, Cargo, Tipo de Contratación y Salario son obligatorios.' });
      return;
    }

    startTransition(() => {
      const selectedUser = users?.find(u => u.id === userId);
      if (!selectedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'El usuario seleccionado no es válido.' });
        return;
      }
      
      const employeeRef = doc(firestore, 'technicalOfficeEmployees', userId);
      const newSalary = parseFloat(monthlySalary) || 0;
      const batch = writeBatch(firestore);

      const employeeData: TechnicalOfficeEmployee = {
        id: userId,
        userId,
        fullName: selectedUser.fullName,
        position,
        employmentType,
        monthlySalary: newSalary,
        status,
      };
      batch.set(employeeRef, employeeData, { merge: true });

      if (!isEditMode || (employee && employee.monthlySalary !== newSalary)) {
          const salaryHistoryRef = doc(collection(firestore, `technicalOfficeEmployees/${userId}/salaryHistory`));
          const newSalaryHistoryEntry: SalaryHistory = {
              id: salaryHistoryRef.id,
              amount: newSalary,
              effectiveDate: new Date().toISOString(),
          };
          batch.set(salaryHistoryRef, newSalaryHistoryEntry);
      }

      batch.commit()
        .then(() => {
            toast({
              title: isEditMode ? 'Empleado Actualizado' : 'Empleado Creado',
              description: `Los datos de ${selectedUser.fullName} han sido guardados.`,
            });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el empleado. Es posible que no tengas permisos.' });
        });
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
            <Label htmlFor="employmentType">Tipo de Contratación</Label>
            <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                <SelectTrigger id="employmentType">
                <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Relación de Dependencia">Relación de Dependencia</SelectItem>
                    <SelectItem value="Monotributo">Monotributo</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySalary">
                {employmentType === 'Relación de Dependencia' ? 'Salario Mensual Bruto (ARS)' : 'Honorarios Mensuales (ARS)'}
            </Label>
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
