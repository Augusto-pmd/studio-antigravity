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
import { contractors } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Contractor } from "@/lib/types";
import { differenceInDays, parseISO, isBefore } from 'date-fns';
import { TriangleAlert, Pencil, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { ContractorDialog } from "./contractor-dialog";
import { PersonnelDialog } from "./personnel-dialog";

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-AR');
}

export function ContractorsTable() {

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
                <TableHead>Vencimiento Docs.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((contractor: Contractor) => {
                const artStatus = getDocStatus(contractor.artExpiryDate);
                const insuranceStatus = getDocStatus(contractor.insuranceExpiryDate);
                const docStatus = artStatus || insuranceStatus;

                return (
                <TableRow key={contractor.id}>
                  <TableCell>
                    <div className="font-medium">{contractor.name}</div>
                    <div className="text-sm text-muted-foreground">{contractor.cuit}</div>
                  </TableCell>
                  <TableCell>
                     <div className="font-medium">{contractor.contactPerson}</div>
                    <div className="text-sm text-muted-foreground">{contractor.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                          "capitalize",
                          contractor.status === "Aprobado" && "bg-green-900/40 text-green-300 border-green-700",
                          contractor.status === "Pendiente" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                          contractor.status === "Rechazado" && "bg-red-900/40 text-red-300 border-red-700",
                      )}
                    >
                      {contractor.status}
                    </Badge>
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
                      <span>{docStatus ? (artStatus ? formatDate(contractor.artExpiryDate) : formatDate(contractor.insuranceExpiryDate)) : 'Al día'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <PersonnelDialog contractor={contractor}>
                        <Button variant="ghost" size="icon">
                          <Users className="h-4 w-4" />
                          <span className="sr-only">Ver Personal</span>
                        </Button>
                      </PersonnelDialog>
                      <ContractorDialog contractor={contractor}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                           <span className="sr-only">Editar</span>
                        </Button>
                      </ContractorDialog>
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
