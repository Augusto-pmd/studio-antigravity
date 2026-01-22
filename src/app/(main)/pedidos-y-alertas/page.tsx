'use client';

import { Button } from "@/components/ui/button";
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
import { PlusCircle } from "lucide-react";

export default function PedidosYAlertasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Pedidos y Alertas</h1>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Pedido
        </Button>
      </div>
      <p className="text-muted-foreground">
        Un espacio centralizado para gestionar pedidos y tareas entre los miembros del equipo.
      </p>

      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendientes">Mis Tareas Pendientes</TabsTrigger>
          <TabsTrigger value="realizados">Pedidos Realizados</TabsTrigger>
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
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Aquí se mostrará la lista de tareas asignadas a ti.
              </div>
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
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Aquí se mostrará la lista de tareas que has creado.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

    