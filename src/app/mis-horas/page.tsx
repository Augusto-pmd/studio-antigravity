'use client';

import { UserTimeLog } from "@/components/recursos-humanos/user-time-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { HoursReport } from "@/components/recursos-humanos/hours-report";

export default function MisHorasPage() {
  const { permissions } = useUser();

  return (
     <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-headline">Registro de Horas (Oficina Técnica)</h1>
        </div>
        <Tabs defaultValue="mis-horas" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
                <TabsTrigger value="mis-horas">Mis Horas</TabsTrigger>
                {permissions.isSuperAdmin && (
                    <TabsTrigger value="reporte-horas">Reporte de Horas por Obra</TabsTrigger>
                )}
            </TabsList>
            <TabsContent value="mis-horas" className="mt-6">
                <p className="text-muted-foreground mb-6">
                    Registre las horas dedicadas a cada proyecto por día.
                </p>
                <UserTimeLog />
            </TabsContent>
            {permissions.isSuperAdmin && (
                <TabsContent value="reporte-horas" className="mt-6">
                     <p className="text-muted-foreground mb-6">
                        Análisis de horas y costos de personal de oficina imputados a cada proyecto.
                    </p>
                    <HoursReport />
                </TabsContent>
            )}
        </Tabs>
    </div>
  );
}
