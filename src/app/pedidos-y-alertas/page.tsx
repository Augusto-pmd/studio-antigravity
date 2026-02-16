'use client';

import { CreatedTasksList } from "@/components/pedidos/created-tasks-list";
import { NewRequestDialog } from "@/components/pedidos/new-request-dialog";
import { PendingTasksList } from "@/components/pedidos/pending-tasks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import { ClientFollowUpDialog } from "@/components/pedidos/client-follow-up-dialog";
import { ClientFollowUpsTable } from "@/components/pedidos/client-follow-ups-table";

export default function PedidosAlertasPage() {
  const { permissions } = useUser();
  const isDirector = permissions.isSuperAdmin;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline">Pedidos y Alertas</h1>
          <p className="text-muted-foreground">
            {isDirector
              ? "Cree y de seguimiento a tareas, alertas y al proceso de seguimiento de potenciales clientes."
              : "Cree y de seguimiento a las tareas y pedidos asignados entre los miembros del equipo."}
          </p>
        </div>
        <div className="flex gap-2">
          {isDirector && <ClientFollowUpDialog />}
          <NewRequestDialog />
        </div>
      </div>

      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList className={cn("grid w-full", isDirector ? "md:grid-cols-4" : "md:grid-cols-2")}>
          <TabsTrigger value="pendientes">{permissions.canSupervise ? 'Tareas Pendientes (Todos)' : 'Mis Tareas Pendientes'}</TabsTrigger>
          <TabsTrigger value="creados">{permissions.canSupervise ? 'Historial (Todos)' : 'Pedidos Creados por Mí'}</TabsTrigger>
          {isDirector && <TabsTrigger value="mis-pedidos">Mis Pedidos</TabsTrigger>}
          {isDirector && <TabsTrigger value="clientes">Seguimiento Clientes</TabsTrigger>}
        </TabsList>
        <TabsContent value="pendientes" className="mt-4">
          <PendingTasksList />
        </TabsContent>
        <TabsContent value="creados" className="mt-4">
          <CreatedTasksList />
        </TabsContent>
        {isDirector && (
          <>
            <TabsContent value="mis-pedidos" className="mt-4">
              <CreatedTasksList filterByCurrentUser={true} />
            </TabsContent>
            <TabsContent value="clientes" className="mt-4">
              <ClientFollowUpsTable />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
