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
import { employees } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import { differenceInDays, parseISO, isBefore } from 'date-fns';
import { TriangleAlert, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { EmployeeDialog } from "./employee-dialog";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Add timezone to prevent off-by-one day errors
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-AR');
}

export function EmployeesTable() {

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

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Rubro</TableHead>
                <TableHead>Salario Diario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento ART</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee: Employee) => {
                const artStatus = getArtStatus(employee.artExpiryDate);
                return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">{employee.id}</div>
                  </TableCell>
                  <TableCell>{employee.category}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(employee.dailyWage)}</TableCell>
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
                  <TableCell>
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
