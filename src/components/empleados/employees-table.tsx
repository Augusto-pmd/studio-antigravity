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
import { TriangleAlert, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { EmployeeDialog } from "./employee-dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

export function EmployeesTable() {
  const firestore = useFirestore();
  const employeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
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

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead className="hidden md:table-cell">Rubro</TableHead>
                <TableHead className="hidden lg:table-cell">Salario Diario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Vencimiento ART</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay empleados registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {employees?.map((employee: Employee) => {
                const artStatus = getArtStatus(employee.artExpiryDate);
                return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{employee.category}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{employee.category}</TableCell>
                  <TableCell className="hidden font-mono lg:table-cell">{formatCurrency(employee.dailyWage)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.status === 'Activo' ? 'default' : 'secondary'}
                      className={cn(
                          "capitalize",
                          employee.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                          employee.status === "Inactivo" && "bg-gray-700/40 text-gray-400 border-gray-600",
                      )}
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(employee.artExpiryDate)}</span>
                      {artStatus && (
                          <Tooltip>
                              <TooltipTrigger>
                                <TriangleAlert className={cn(
                                    "h-5 w-5",
                                    artStatus.variant === 'destructive' && 'text-destructive',
                                    artStatus.variant === 'warning' && 'text-yellow-500'
                                )} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{artStatus.message}</p>
                              </TooltipContent>
                          </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <EmployeeDialog employee={employee}>
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                        </Button>
                    </EmployeeDialog>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
      </div>
    </TooltipProvider>
  );
}
