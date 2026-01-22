'use client';

import { AssetDialog } from "@/components/activos/asset-dialog";
import { AssetsTable } from "@/components/activos/assets-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ActivosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Activos</h1>
        <AssetDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Activo
          </Button>
        </AssetDialog>
      </div>
      <p className="text-muted-foreground">
        Registro y seguimiento de los activos fijos de la compañía.
      </p>
      <AssetsTable />
    </div>
  );
}
