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
import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { useFirestore, useCollection } from "@/firebase";
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const supplierConverter = {
  toFirestore: (data: Supplier): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

export function SuppliersTable() {
  const firestore = useFirestore();
  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><div className="space-y-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border-0 shadow-glass bg-white/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/20">
              <TableHead className="pl-6">Proveedor</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="text-right pr-6">Acciones</TableHead>
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
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No hay proveedores registrados. Comience creando uno nuevo.
                </TableCell>
              </TableRow>
            )}
            {suppliers?.map((supplier: Supplier) => {
              return (
                <TableRow key={supplier.id} className="hover:bg-primary/5 transition-colors border-b border-white/10 last:border-0">
                  <TableCell className="pl-6 py-4">
                    <div className="font-semibold text-base text-foreground">{supplier.name}</div>
                    {supplier.alias && <div className="text-sm text-muted-foreground font-light">{supplier.alias}</div>}
                    <div className="text-sm text-muted-foreground">{supplier.cuit}</div>
                    <div className="md:hidden mt-2 space-y-1 text-sm text-muted-foreground">
                      <div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-xs rounded-lg px-2 py-0.5",
                            supplier.status === "Aprobado" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                            supplier.status === "Pendiente" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                            supplier.status === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
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
                        "capitalize rounded-xl px-3 py-1",
                        supplier.status === "Aprobado" && "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
                        supplier.status === "Pendiente" && "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
                        supplier.status === "Rechazado" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
                      )}
                    >
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <SupplierDialog supplier={supplier}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    </SupplierDialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
