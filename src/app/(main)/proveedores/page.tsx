import { AddSupplierDialog } from "@/components/proveedores/add-supplier-dialog";
import { SuppliersTable } from "@/components/proveedores/suppliers-table";

export default function ProveedoresPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Proveedores</h1>
        <AddSupplierDialog />
      </div>
      <p className="text-muted-foreground">Registro de contratistas y control de documentación (ART/Seguros).</p>
      <SuppliersTable />
    </div>
  );
}
