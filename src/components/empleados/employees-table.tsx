'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import { differenceInDays, parseISO, isBefore, format as formatDateFns } from 'date-fns';
import { TriangleAlert, Pencil, Trash2, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmployeeDialog } from "@/components/empleados/employee-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, doc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { EmployeeFileDialog } from "./employee-file-dialog";


const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

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
      name: data.name || '',
      email: data.email || undefined,
      phone: data.phone || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactPhone: data.emergencyContactPhone || undefined,
      status: data.status || 'Inactivo',
      paymentType: data.paymentType || 'Semanal',
      category: data.category || '',
      dailyWage: data.dailyWage || 0,
      artExpiryDate: data.artExpiryDate || undefined,
      documents: data.documents || [],
    };
  }
};

export function EmployeesTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const employeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const getArtStatus = (dateString?: string): { variant: 'destructive' | 'warning', message: string, daysLeft: number | null } | null => {
    if (!dateString) return null;

    const expiryDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the beginning of the day
    const daysLeft = differenceInDays(expiryDate, today);

    if (isBefore(expiryDate, today)) {
      return { variant: 'destructive', message: `Vencido hace ${Math.abs(daysLeft)} días`, daysLeft };
    }
    if (daysLeft <= 30) {
      return { variant: 'warning', message: `Vence en ${daysLeft} días`, daysLeft };
    }
    return null;
  };

  const handleDelete = (employeeId: string, employeeName: string) => {
    if (!firestore) return;
    const employeeRef = doc(firestore, 'employees', employeeId);
    deleteDoc(employeeRef)
      .then(() => {
        toast({
          title: "Empleado Eliminado",
          description: `El empleado "${employeeName}" ha sido eliminado.`,
        });
      })
      .catch((error) => {
        console.error("Error deleting employee: ", error);
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: "No se pudo eliminar el empleado. Es posible que no tengas permisos.",
        });
      });
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-white/20">
                <TableHead className="pl-6">Empleado</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && employees?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay empleados registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {employees?.map((employee: Employee) => {
                const artStatus = getArtStatus(employee.artExpiryDate);
                return (
                  <TableRow key={employee.id} className="hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0">
                    <TableCell className="pl-6 py-4">
                      <div className="font-semibold text-base text-foreground">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">{employee.category}</div>
                      <div className="hidden md:block text-sm text-muted-foreground">{employee.email}</div>
                      <div className="hidden md:block text-sm text-muted-foreground">{employee.phone}</div>
                      {employee.emergencyContactName && (
                        <div className="hidden md:block text-sm text-muted-foreground">
                          Contacto Emergencia: {employee.emergencyContactName} ({employee.emergencyContactPhone})
                        </div>
                      )}
                      <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>
                          <Badge
                            variant={employee.status === 'Activo' ? 'default' : 'secondary'}
                            className={cn(
                              "capitalize text-xs rounded-lg px-2 py-0.5",
                              employee.status === "Activo" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                              employee.status === "Inactivo" && "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-600",
                            )}
                          >
                            {employee.status}
                          </Badge>
                        </div>
                        {employee.email && <p>{employee.email}</p>}
                        {employee.phone && <p>{employee.phone}</p>}
                        {employee.emergencyContactName && (
                          <p>
                            <span className="font-semibold text-foreground">Emergencia:</span> {employee.emergencyContactName} ({employee.emergencyContactPhone})
                          </p>
                        )}
                        <p>Jornal: <span className="font-mono text-foreground">{formatCurrency(employee.dailyWage)}</span></p>
                        {artStatus && <div className={cn(artStatus.variant === 'destructive' && 'text-destructive', artStatus.variant === 'warning' && 'text-yellow-500')}>ART: {artStatus.message}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={employee.status === 'Activo' ? 'default' : 'secondary'}
                        className={cn(
                          "capitalize rounded-xl px-3 py-1",
                          employee.status === "Activo" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                          employee.status === "Inactivo" && "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-600",
                        )}
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EmployeeFileDialog employee={employee}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Legajo</span>
                          </Button>
                        </EmployeeFileDialog>
                        <EmployeeDialog employee={employee}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </EmployeeDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente al empleado
                                <span className="font-semibold"> {employee.name}</span> del sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(employee.id, employee.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
