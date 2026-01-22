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
import { suppliers } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import { Pencil } from "lucide-react";
import { SupplierDialog } from "./supplier-dialog";

export function SuppliersTable() {

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier: Supplier) => {
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
