import { CreatedTasksList } from "@/components/pedidos/created-tasks-list";
import { NewRequestDialog } from "@/components/pedidos/new-request-dialog";
import { PendingTasksList } from "@/components/pedidos/pending-tasks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PedidosAlertasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-headline">Pedidos y Alertas</h1>
        <div className="flex gap-2">
            <NewRequestDialog />
        </div>
      </div>
      <p className="text-muted-foreground">
        Cree y de seguimiento a las tareas y pedidos asignados entre los miembros del equipo.
      </p>
      
      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendientes">Mis Tareas Pendientes</TabsTrigger>
          <TabsTrigger value="creados">Pedidos Creados por Mí</TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes" className="mt-4">
          <PendingTasksList />
        </TabsContent>
        <TabsContent value="creados" className="mt-4">
          <CreatedTasksList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
