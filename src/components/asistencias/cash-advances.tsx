'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddCashAdvanceDialog } from "./add-cash-advance-dialog";

// Mock data, will be replaced with Firestore data
const advances: any[] = [];

export function CashAdvances() {
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Gestión de Adelantos</CardTitle>
            <CardDescription>
            Registre y consulte los adelantos de sueldo otorgados a los empleados.
            </CardDescription>
        </div>
        <AddCashAdvanceDialog />
      </CardHeader>
      <CardContent>
         <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Obra</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {advances.length > 0 ? (
                        advances.map(advance => (
                            <TableRow key={advance.id}>
                                <TableCell>{advance.date}</TableCell>
                                <TableCell>{advance.employeeName}</TableCell>
                                <TableCell>{advance.projectName}</TableCell>
                                <TableCell className="text-right">{advance.amount}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No hay adelantos registrados para esta semana.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
         </div>
      </CardContent>
    </Card>
  );
}
