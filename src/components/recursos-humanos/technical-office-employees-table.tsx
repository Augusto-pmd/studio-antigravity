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
import type { TechnicalOfficeEmployee } from "@/lib/types";
import { Pencil } from "lucide-react";
import { TechnicalOfficeEmployeeDialog } from "./technical-office-employee-dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export function TechnicalOfficeEmployeesTable() {
  const firestore = useFirestore();
  const employeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'technicalOfficeEmployees') : null), [firestore]);
  const { data: employees, isLoading } = useCollection<TechnicalOfficeEmployee>(employeesQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && employees?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay empleados de oficina registrados.
                  </TableCell>
                </TableRow>
              )}
              {employees?.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                      <div className="font-medium">{employee.fullName}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{employee.position}</div>
                      <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <p><span className='font-medium text-foreground'>Salario:</span> <span className='font-mono'>{formatCurrency(employee.monthlySalary)}</span></p>
                        <p>
                             <Badge
                                variant={employee.status === 'Activo' ? 'default' : 'secondary'}
                                className={cn(
                                    "capitalize text-xs",
                                    employee.status === "Activo" && "bg-green-900/40 text-green-300 border-green-700",
                                    employee.status === "Inactivo" && "bg-gray-700/40 text-gray-400 border-gray-600",
                                )}
                                >
                                {employee.status}
                                </Badge>
                        </p>
                      </div>
                  </TableCell>
                  <TableCell className='hidden md:table-cell'>{employee.position}</TableCell>
                  <TableCell className="hidden md:table-cell">
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
                  <TableCell className="text-right">
                    <TechnicalOfficeEmployeeDialog employee={employee}>
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                        </Button>
                    </TechnicalOfficeEmployeeDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
