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
import { cn } from "@/lib/utils";

// Mock data, will be replaced with Firestore data
const requests = [
    { id: 'FR-001', date: '16/07/2024', requesterName: 'Juan Pérez', projectName: 'Edificio Corporativo Central', category: 'Materiales', amount: 150000, currency: 'ARS', status: 'Pendiente' },
    { id: 'FR-002', date: '16/07/2024', requesterName: 'Carlos Lopez', projectName: 'Remodelación Oficinas PMD', category: 'Logística y PMD', amount: 25000, currency: 'ARS', status: 'Aprobado' },
    { id: 'FR-003', date: '15/07/2024', requesterName: 'Maria González', projectName: 'N/A', category: 'Viáticos', amount: 12000, currency: 'ARS', status: 'Pagado' },
    { id: 'FR-004', date: '15/07/2024', requesterName: 'Juan Pérez', projectName: 'Parque Industrial Norte', category: 'Materiales', amount: 500, currency: 'USD', status: 'Rechazado' },
];

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}


export function FundRequestsTable() {
  return (
     <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requests.length > 0 ? (
                    requests.map(req => (
                        <TableRow key={req.id}>
                            <TableCell>{req.date}</TableCell>
                            <TableCell className="font-medium">{req.requesterName}</TableCell>
                            <TableCell>{req.category}</TableCell>
                            <TableCell>{req.projectName}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn(
                                    req.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                                    req.status === 'Aprobado' && 'text-green-500 border-green-500',
                                    req.status === 'Pagado' && 'text-blue-500 border-blue-500',
                                    req.status === 'Rechazado' && 'text-destructive border-destructive',
                                )}>
                                    {req.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(req.amount, req.currency)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No hay solicitudes de fondos para esta semana.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
     </div>
  );
}
