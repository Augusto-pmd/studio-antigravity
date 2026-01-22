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
import { suppliers } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import { differenceInDays, parseISO, isBefore } from 'date-fns';
import { TriangleAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-AR');
}

export function SuppliersTable() {

  const getDocStatus = (dateString?: string): { variant: 'destructive' | 'warning', message: string } | null => {
    if (!dateString) return null;

    const expiryDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(expiryDate, today);

    if (isBefore(expiryDate, today)) {
        return { variant: 'destructive', message: `Vencido hace ${Math.abs(daysLeft)} días` };
    }
    if (daysLeft <= 30) {
        return { variant: 'warning', message: `Vence en ${daysLeft} días` };
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimiento Docs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier: Supplier) => {
                const artStatus = getDocStatus(supplier.artExpiryDate);
                const insuranceStatus = getDocStatus(supplier.insuranceExpiryDate);
                const docStatus = artStatus || insuranceStatus;

                return (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-muted-foreground">{supplier.cuit}</div>
                  </TableCell>
                  <TableCell>
                     <div className="font-medium">{supplier.contactPerson}</div>
                    <div className="text-sm text-muted-foreground">{supplier.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                          "capitalize",
                          supplier.status === "Aprobado" && "bg-green-900/40 text-green-300 border-green-700",
                          supplier.status === "Pendiente" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                          supplier.status === "Rechazado" && "bg-red-900/40 text-red-300 border-red-700",
                      )}
                    >
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {docStatus && (
                          <Tooltip>
                              <TooltipTrigger>
                                <TriangleAlert className={cn(
                                    "h-5 w-5",
                                    docStatus.variant === 'destructive' && 'text-destructive',
                                    docStatus.variant === 'warning' && 'text-yellow-500'
                                )} />
                              </TooltipTrigger>
                              <TooltipContent>
                                {artStatus && <p>ART: {artStatus.message}</p>}
                                {insuranceStatus && <p>Seguro: {insuranceStatus.message}</p>}
                              </TooltipContent>
                          </Tooltip>
                      )}
                      <span>{docStatus ? (artStatus ? formatDate(supplier.artExpiryDate) : formatDate(supplier.insuranceExpiryDate)) : 'Al día'}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
      </div>
    </TooltipProvider>
  );
}
