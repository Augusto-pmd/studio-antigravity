'use client';

import { SaleDialog } from "@/components/ventas/sale-dialog";
import { SalesTable } from "@/components/ventas/sales-table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function VentasPage() {
  const { permissions } = useUser();

  if (!permissions.canManageSales) {
    return (
      <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg font-medium text-muted-foreground">Acceso Denegado</p>
              <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
          </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Ventas</h1>
          <p className="mt-1 text-muted-foreground">
            Registre las facturas de venta para llevar un control del IVA Débito Fiscal y la facturación.
          </p>
        </div>
        {permissions.canManageSales && (
          <SaleDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </SaleDialog>
        )}
      </div>
      <SalesTable />
    </div>
  );
}
