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
import type { Supplier } from "@/lib/types";
import { Pencil } from "lucide-react";
import { SupplierDialog } from "./supplier-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";

export function SuppliersTable() {
  const firestore = useFirestore();
  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
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
              {!isLoading && suppliers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay proveedores registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {suppliers?.map((supplier: Supplier) => {
                return (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-muted-foreground">{supplier.cuit}</div>
                    <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>
                             <Badge
                                variant="outline"
                                className={cn(
                                    "capitalize text-xs",
                                    supplier.status === "Aprobado" && "bg-green-900/40 text-green-300 border-green-700",
                                    supplier.status === "Pendiente" && "bg-yellow-900/40 text-yellow-300 border-yellow-700",
                                    supplier.status === "Rechazado" && "bg-red-900/40 text-red-300 border-red-700",
                                )}
                                >
                                {supplier.status}
                                </Badge>
                        </div>
                        <div><Badge variant="secondary" className="text-xs">{supplier.type}</Badge></div>
                        {supplier.contactPerson && <p>Contacto: {supplier.contactPerson}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
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
                  <TableCell className="text-right">
                    <SupplierDialog supplier={supplier}>
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                        </Button>
                    </SupplierDialog>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
      </div>
  );
}
