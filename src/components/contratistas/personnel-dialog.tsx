"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PlusCircle, TriangleAlert } from "lucide-react";
import type { Contractor, ContractorEmployee } from "@/lib/types";
import { differenceInDays, isBefore, parseISO, format as formatDateFns } from "date-fns";
import { AddPersonnelDialog } from "./add-personnel-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const getArtStatus = (dateString?: string): { variant: 'destructive' | 'warning', message: string } | null => {
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

export function PersonnelDialog({
  contractor,
  children,
}: {
  contractor: Contractor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();

  const personnelQuery = useMemo(
    () => (firestore ? collection(firestore, `contractors/${contractor.id}/personnel`) : null),
    [firestore, contractor.id]
  );
  const { data: personnel, isLoading } = useCollection<ContractorEmployee>(personnelQuery);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personal de {contractor.name}</DialogTitle>
          <DialogDescription>
            Listado del personal asignado por el contratista y estado de su
            documentación.
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider>
            <div className="py-4">
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Vencimiento ART</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <div className="flex flex-col gap-2">
                             <Skeleton className="h-5 w-full" />
                             <Skeleton className="h-5 w-full" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && (!personnel || personnel.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                          No hay personal registrado para este contratista.
                        </TableCell>
                      </TableRow>
                    ) : personnel?.map((person) => {
                        const artStatus = getArtStatus(person.artExpiryDate);
                        return (
                        <TableRow key={person.id}>
                            <TableCell className="font-medium">{person.name}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span>{formatDate(person.artExpiryDate)}</span>
                                    {artStatus && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                        <TriangleAlert
                                            className={cn(
                                            "h-5 w-5",
                                            artStatus.variant === "destructive" && "text-destructive",
                                            artStatus.variant === "warning" && "text-yellow-500"
                                            )}
                                        />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                        <p>{artStatus.message}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>
            </div>
        </TooltipProvider>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <AddPersonnelDialog contractorId={contractor.id}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Personal
            </Button>
          </AddPersonnelDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
