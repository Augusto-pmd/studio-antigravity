'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActionTimeline } from "./action-timeline";
import { ShieldAlert, Users, History } from "lucide-react";

export function AuditDashboard() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Summary Metrics Placeholders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Acciones (Hoy)</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Registro de movimientos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">En las últimas 24hs</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="timeline" className="gap-2"><History className="h-4 w-4" /> Línea de Tiempo</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2"><ShieldAlert className="h-4 w-4" /> Seguridad</TabsTrigger>
                    {/* Attendance will be mapped here later once collection is ready */}
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Actividad</CardTitle>
                            <CardDescription>
                                Historial detallado de todas las acciones realizadas por el personal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ActionTimeline />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alertas de Seguridad</CardTitle>
                            <CardDescription>Monitor de accesos y acciones de alto riesgo.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-md border-dashed border">
                            <p>No se han detectado alertas de seguridad recientes.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
