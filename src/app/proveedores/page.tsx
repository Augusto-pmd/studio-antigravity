import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { SuppliersTable } from "@/components/proveedores/suppliers-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ProveedoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Proveedores</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione el listado de proveedores de materiales y servicios.
          </p>
        </div>
        <SupplierDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </SupplierDialog>
      </div>
      <SuppliersTable />
    </div>
  );
}
