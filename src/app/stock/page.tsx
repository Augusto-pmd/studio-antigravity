'use client';

import { StockItemDialog } from "@/components/stock/stock-item-dialog";
import { StockTable } from "@/components/stock/stock-table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { PlusCircle } from "lucide-react";

export default function StockPage() {
  const { permissions } = useUser();
  const canManageStock = permissions.canManageStock;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Stock</h1>
          <p className="mt-1 text-muted-foreground">
            Inventario de herramientas, consumibles e insumos.
          </p>
        </div>
        {canManageStock && (
          <StockItemDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Ítem
            </Button>
          </StockItemDialog>
        )}
      </div>
      <StockTable />
    </div>
  );
}
