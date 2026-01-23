import { UsersTable } from "@/components/usuarios/users-table";

export default function UsuariosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Usuarios</h1>
      </div>
      <p className="text-muted-foreground">
        Administre los usuarios del sistema y sus roles de acceso.
      </p>
      <UsersTable />
    </div>
  );
}
