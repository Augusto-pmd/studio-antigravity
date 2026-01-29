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
import { Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser, useCollection } from '@/firebase';
import { collection, doc, setDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
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
            documents: data.documents,
            email: data.email,
            phone: data.phone,
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
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

export function AddCashAdvanceDialog({ currentWeek }: { currentWeek?: PayrollWeek }) {
  const [open, setOpen] = useState(false);
  const { firestore } = useUser();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

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
    setDate(new Date());
    setSelectedEmployeeId(undefined);
    setSelectedProjectId(undefined);
    setAmount('');
    setReason('');
  };
  
  useEffect(() => {
    setIsClient(true);
    if (open) {
        resetForm();
    }
  }, [open]);

  const handleSave = async () => {
    if (!firestore || !currentWeek) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay una semana de pagos activa.' });
        return;
    }
    if (!selectedEmployeeId || !date || !amount) {
        toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Empleado, Fecha y Monto son obligatorios.' });
        return;
    }

    const selectedEmployee = employees?.find((e: Employee) => e.id === selectedEmployeeId);
    if (!selectedEmployee) {
        toast({ variant: 'destructive', title: 'Error', description: 'Empleado no válido.' });
        return;
    }

    setIsPending(true);
    try {
      const selectedProject = projects?.find((p: Project) => p.id === selectedProjectId);

      const advancesCollection = collection(firestore, 'cashAdvances');
      const advanceRef = doc(advancesCollection);
      const advanceId = advanceRef.id;

      const newAdvance: CashAdvance = {
          id: advanceId,
          payrollWeekId: currentWeek.id,
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name,
          projectId: selectedProject?.id,
          projectName: selectedProject?.name,
          date: date.toISOString(),
          amount: parseFloat(amount) || 0,
          reason: reason || undefined,
      };

      await setDoc(advanceRef, newAdvance);

      toast({
          title: 'Adelanto Registrado',
          description: `Se ha guardado el adelanto para ${selectedEmployee.name}.`,
      });
      setOpen(false);
    } catch (error) {
        console.error("Error writing to Firestore:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudo guardar el adelanto. Es posible que no tengas permisos.",
        });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!currentWeek}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Adelanto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Adelanto de Sueldo</DialogTitle>
          <DialogDescription>
            Complete el formulario para registrar un nuevo adelanto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="employee" className="text-right">
              Empleado
            </Label>
            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isLoadingEmployees}>
              <SelectTrigger id="employee" className="col-span-3">
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Obra
            </Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project" className="col-span-3">
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

           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
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
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto
            </Label>
            <Input id="amount" type="number" placeholder="ARS" className="col-span-3" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right pt-2">
              Motivo
            </Label>
            <Textarea id="reason" placeholder="Motivo del adelanto (opcional)" className="col-span-3" value={reason} onChange={(e: any) => setReason(e.target.value)}/>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Adelanto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
