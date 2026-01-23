'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { NewRequestDialog } from "@/components/pedidos/new-request-dialog";
import { PendingTasksList } from "@/components/pedidos/pending-tasks-list";
import { CreatedTasksList } from "@/components/pedidos/created-tasks-list";
import { BotMessageSquare } from "lucide-react";
import { AiAssistant } from "@/components/pedidos/ai-assistant";

export default function PedidosYAlertasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Pedidos y Alertas</h1>
        <NewRequestDialog />
      </div>
      <p className="text-muted-foreground">
        Un espacio centralizado para gestionar pedidos, tareas y consultas entre los miembros del equipo.
      </p>

      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendientes">Mis Tareas Pendientes</TabsTrigger>
          <TabsTrigger value="realizados">Pedidos Realizados</TabsTrigger>
          <TabsTrigger value="asistente">
            <BotMessageSquare className="mr-2 h-4 w-4" />
            Asistente IA
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mis Tareas Pendientes</CardTitle>
              <CardDescription>
                Estas son las tareas y pedidos que otros usuarios te han asignado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingTasksList />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="realizados" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Realizados por Mí</CardTitle>
              <CardDescription>
                Seguimiento de las tareas y pedidos que has creado para otros usuarios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreatedTasksList />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="asistente" className="mt-4">
            <AiAssistant />
        </TabsContent>
      </Tabs>

    </div>
  );
}
