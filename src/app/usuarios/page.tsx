import { UsersTable } from "@/components/usuarios/users-table";

export default function UsuariosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Usuarios</h1>
          <p className="mt-1 text-muted-foreground">
            Administre los usuarios del sistema y sus roles de acceso.
          </p>
        </div>
      </div>
      <UsersTable />
    </div>
  );
}
