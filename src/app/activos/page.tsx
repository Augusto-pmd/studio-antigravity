'use client';

import { AssetDialog } from "@/components/activos/asset-dialog";
import { AssetsTable } from "@/components/activos/assets-table";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

export default function ActivosPage() {
  const { permissions } = useUser();

  if (!permissions.canValidate && !permissions.canSupervise) {
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
          <h1 className="text-3xl font-headline">Activos</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione los activos de la compañía, como vehículos, maquinaria y equipos.
          </p>
        </div>
        <AssetDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Activo
          </Button>
        </AssetDialog>
      </div>
      <AssetsTable />
    </div>
  );
}
