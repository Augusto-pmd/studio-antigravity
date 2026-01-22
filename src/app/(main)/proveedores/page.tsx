import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { SuppliersTable } from "@/components/proveedores/suppliers-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ProveedoresPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Proveedores</h1>
        <SupplierDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Proveedor
            </Button>
        </SupplierDialog>
      </div>
      <p className="text-muted-foreground">Registro de proveedores de materiales y servicios generales.</p>
      <SuppliersTable />
    </div>
  );
}
