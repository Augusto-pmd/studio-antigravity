'use client';

import { UsersTable } from '@/components/usuarios/users-table';
import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function UsuariosPage() {
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
        <h1 className="text-3xl font-headline">Gestión de Usuarios</h1>
      </div>
      <p className="text-muted-foreground">
        Administre los roles y perfiles de todos los usuarios del sistema.
      </p>
      <UsersTable />
    </div>
  );
}
