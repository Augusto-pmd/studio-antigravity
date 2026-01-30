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
import { useUser } from "@/firebase";
import { MoreHorizontal, Check, X, Undo, Receipt, Archive } from "lucide-react";
import type { FundRequest } from "@/lib/types";
import { parseISO, format } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteFundRequestDialog } from "./delete-fund-request-dialog";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'dd/MM/yyyy');
};


export function FundRequestsTable({ requests, isLoading }: { requests: FundRequest[] | null, isLoading: boolean }) {
  const { user, permissions, firestore } = useUser();
  const { toast } = useToast();
  const isAdmin = permissions.canSupervise;

  const handleStatusChange = (requestId: string, status: FundRequest['status']) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    
    const requestRef = doc(firestore, 'fundRequests', requestId);
    const updatedData = { status };

    updateDoc(requestRef, updatedData)
        .then(() => {
            toast({ title: 'Estado actualizado', description: `La solicitud ha sido marcada como ${status.toLowerCase()}.` });
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: "No se pudo cambiar el estado de la solicitud. Es posible que no tengas permisos.",
            });
        });
  };
  
  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
            <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-9 rounded-md ml-auto" /></TableCell>
        </TableRow>
    ))
  );

  return (
     <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead className="hidden md:table-cell">Categoría</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Monto</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && renderSkeleton()}
                {!isLoading && requests?.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                          No hay solicitudes de fondos registradas.
                      </TableCell>
                  </TableRow>
                )}
                {!isLoading && requests?.map(req => {
                    const isOwner = user?.uid === req.requesterId;
                    const canChangeStatus = isAdmin && req.status !== 'Pagado';
                    const canDelete = (isOwner || isAdmin) && req.status === 'Pendiente';

                    return (
                    <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-medium">{req.requesterName}</div>
                          <div className="text-sm text-muted-foreground">{req.projectName || 'N/A'}</div>
                          {req.description && <p className="text-xs text-muted-foreground mt-1 italic">"{req.description}"</p>}
                          <div className='md:hidden mt-2 space-y-1 text-sm text-muted-foreground'>
                            <p>{req.category}</p>
                            <p>{formatDate(req.date)}</p>
                            <p className='font-mono font-semibold text-foreground'>{formatCurrency(req.amount, req.currency)}</p>
                             <div>
                                <Badge variant="outline" className={cn(
                                    'text-xs capitalize',
                                    req.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                                    req.status === 'Aprobado' && 'text-green-500 border-green-500',
                                    req.status === 'Pagado' && 'text-blue-500 border-blue-500',
                                    req.status === 'Aplazado' && 'text-gray-500 border-gray-500',
                                    req.status === 'Rechazado' && 'text-destructive border-destructive',
                                )}>
                                    {req.status}
                                </Badge>
                             </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{req.category}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(req.date)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={cn(
                                'capitalize',
                                req.status === 'Pendiente' && 'text-yellow-500 border-yellow-500',
                                req.status === 'Aprobado' && 'text-green-500 border-green-500',
                                req.status === 'Pagado' && 'text-blue-500 border-blue-500',
                                req.status === 'Aplazado' && 'text-gray-500 border-gray-500',
                                req.status === 'Rechazado' && 'text-destructive border-destructive',
                            )}>
                                {req.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono hidden md:table-cell">{formatCurrency(req.amount, req.currency)}</TableCell>
                         <TableCell className="text-right">
                                {canChangeStatus || canDelete ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {canChangeStatus && (
                                                <>
                                                    {req.status === 'Pendiente' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Aprobado')}>
                                                                <Check className="mr-2 h-4 w-4 text-green-500" />
                                                                <span>Aprobar</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Aplazado')}>
                                                                <Archive className="mr-2 h-4 w-4" />
                                                                <span>Aplazar</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Rechazado')} className="text-destructive focus:text-destructive">
                                                                <X className="mr-2 h-4 w-4" />
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
                                                             <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Aplazado')}>
                                                                <Archive className="mr-2 h-4 w-4" />
                                                                <span>Aplazar</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Pendiente')}>
                                                                <Undo className="mr-2 h-4 w-4" />
                                                                <span>Volver a Pendiente</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {(req.status === 'Rechazado' || req.status === 'Aplazado') && (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Pendiente')}>
                                                            <Undo className="mr-2 h-4 w-4" />
                                                            <span>Reactivar (a Pendiente)</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                            {canDelete && (
                                                <>
                                                    {canChangeStatus && <DropdownMenuSeparator />}
                                                    <DeleteFundRequestDialog request={req} />
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center" /> // Placeholder for alignment
                                )}
                            </TableCell>
                    </TableRow>
                )})}
            </TableBody>
        </Table>
     </div>
  );
}
