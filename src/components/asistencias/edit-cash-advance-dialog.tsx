'use client';

import { useState, useMemo, useEffect, useTransition, ChangeEvent } from "react";
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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser, useCollection } from '@/firebase';
import { collection, doc, updateDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Employee, Project, CashAdvance, PayrollWeek } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const employeeConverter = {
    toFirestore(employee: Employee): DocumentData {
        const { id, ...data } = employee;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Employee {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            status: data.status,
            paymentType: data.paymentType,
            category: data.category,
            dailyWage: data.dailyWage,
            artExpiryDate: data.artExpiryDate,
        };
    }
};

const projectConverter = {
    toFirestore(project: Project): DocumentData {
        const { id, ...data } = project;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Project {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name,
            client: data.client,
            address: data.address,
            currency: data.currency,
            projectType: data.projectType,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            supervisor: data.supervisor,
            budget: data.budget,
            balance: data.balance,
            progress: data.progress,
            description: data.description,
        };
    }
};

export function EditCashAdvanceDialog({ advance, currentWeek, children }: { advance: CashAdvance, currentWeek?: PayrollWeek, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // FORM STATE
  const [date, setDate] = useState<Date | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const [isClient, setIsClient] = useState(false);

  // DATA FETCHING
  const employeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const resetForm = () => {
    setDate(new Date(advance.date));
    setSelectedEmployeeId(advance.employeeId);
    setSelectedProjectId(advance.projectId);
    setAmount(advance.amount.toString());
    setReason(advance.reason || '');
  };
  
  useEffect(() => {
    setIsClient(true);
    if (open) {
        resetForm();
    }
  }, [open, advance]);

  const handleSave = () => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error de conexión.' });
        return;
    }
    if (!selectedEmployeeId || !date || !amount) {
        toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Empleado, Fecha y Monto son obligatorios.' });
        return;
    }

    startTransition(() => {
      const selectedEmployee = employees?.find((e: Employee) => e.id === selectedEmployeeId);
      const selectedProject = projects?.find((p: Project) => p.id === selectedProjectId);

      if (!selectedEmployee) {
          toast({ variant: 'destructive', title: 'Error', description: 'Empleado no válido.' });
          return;
      }

      const advanceRef = doc(firestore, 'cashAdvances', advance.id);

      const updatedAdvance: Partial<CashAdvance> = {
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name,
          projectId: selectedProject?.id,
          projectName: selectedProject?.name,
          date: date.toISOString(),
          amount: parseFloat(amount) || 0,
          reason: reason || undefined,
      };

      updateDoc(advanceRef, updatedAdvance)
        .then(() => {
            toast({
                title: 'Adelanto Actualizado',
                description: `Se ha actualizado el adelanto para ${selectedEmployee.name}.`,
            });
            setOpen(false);
        })
        .catch((error) => {
            console.error("Error updating document:", error);
            toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: "No se pudo actualizar el adelanto. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Adelanto de Sueldo</DialogTitle>
          <DialogDescription>
            Modifique los detalles del adelanto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado</Label>
            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isLoadingEmployees}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Seleccione un empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees?.filter((e: Employee) => e.status === 'Activo').map((e: Employee) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Imputar a una obra (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {projects?.filter((p: Project) => p.status === 'En Curso').map((p: Project) => (
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
                  initialFocus
                  locale={es}
                  disabled={(d: Date) => currentWeek ? (d < new Date(currentWeek.startDate) || d > new Date(currentWeek.endDate)) : false}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" type="number" placeholder="ARS" value={amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea id="reason" placeholder="Motivo del adelanto (opcional)" value={reason} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}/>
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
