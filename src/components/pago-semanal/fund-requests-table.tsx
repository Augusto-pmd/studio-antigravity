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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { MoreHorizontal, Check, X, Undo, Receipt } from "lucide-react";
import type { FundRequest } from "@/lib/types";
import { parseISO, format } from "date-fns";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};


export function FundRequestsTable({ requests, isLoading }: { requests: FundRequest[] | null, isLoading: boolean }) {
  const { permissions, firestore } = useUser();
  const { toast } = useToast();
  const isAdmin = permissions.canValidate;

  const handleStatusChange = (requestId: string, status: FundRequest['status']) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    const requestRef = doc(firestore, 'fundRequests', requestId);
    updateDocumentNonBlocking(requestRef, { status });
    toast({ title: 'Estado actualizado', description: `La solicitud ha sido marcada como ${status.toLowerCase()}.` });
  };
  
  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
            {isAdmin && <TableCell className="text-right"><Skeleton className="h-9 w-9 rounded-md ml-auto" /></TableCell>}
        </TableRow>
    ))
  );

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
                    {isAdmin && (
                      <TableHead className="text-right w-[100px]">Acciones</TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && renderSkeleton()}
                {!isLoading && requests?.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                          No hay solicitudes de fondos registradas.
                      </TableCell>
                  </TableRow>
                )}
                {!isLoading && requests?.map(req => (
                    <TableRow key={req.id}>
                        <TableCell>{formatDate(req.date)}</TableCell>
                        <TableCell className="font-medium">{req.requesterName}</TableCell>
                        <TableCell>{req.category}</TableCell>
                        <TableCell>{req.projectName || 'N/A'}</TableCell>
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
                        {isAdmin && (
                            <TableCell className="text-right">
                                {req.status !== 'Pagado' ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {req.status === 'Pendiente' && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Aprobado')}>
                                                        <Check className="mr-2 h-4 w-4 text-green-500" />
                                                        <span>Aprobar</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Rechazado')}>
                                                        <X className="mr-2 h-4 w-4 text-red-500" />
                                                        <span>Rechazar</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            {req.status === 'Aprobado' && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Pagado')}>
                                                        <Receipt className="mr-2 h-4 w-4 text-blue-500" />
                                                        <span>Marcar como Pagado</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Pendiente')}>
                                                        <Undo className="mr-2 h-4 w-4" />
                                                        <span>Volver a Pendiente</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            {req.status === 'Rechazado' && (
                                                <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Pendiente')}>
                                                    <Undo className="mr-2 h-4 w-4" />
                                                    <span>Volver a Pendiente</span>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center" /> // Placeholder to maintain alignment
                                )}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
     </div>
  );
}
