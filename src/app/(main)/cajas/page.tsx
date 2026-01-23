'use client';

import { CashAccountsDashboard } from "@/components/cajas/cash-accounts-dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/user-context";
import { Loader2 } from "lucide-react";

export default function CajasPage() {
  const { permissions, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!permissions.isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No tienes los permisos necesarios para acceder a esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Cajas</h1>
      </div>
      <p className="text-muted-foreground">
        Administre las cajas de los usuarios, vea saldos y realice refuerzos de fondos.
      </p>
      <CashAccountsDashboard />
    </div>
  );
}
