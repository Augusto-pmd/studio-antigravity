'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PlusCircle, FilePenLine, Eye } from "lucide-react";
import { useUser } from "@/context/user-context";

// Mock data for historical weeks
const historicalWeeks = [
  { id: 'week-03', range: '08/07/2024 al 14/07/2024', status: 'Cerrada' },
  { id: 'week-02', range: '01/07/2024 al 07/07/2024', status: 'Cerrada' },
  { id: 'week-01', range: '24/06/2024 al 30/06/2024', status: 'Cerrada' },
];

export function WeeklySummary() {
  const { permissions } = useUser();
  const isAdmin = permissions.canViewAll; // 'Dirección' role has all permissions

  return (
    <div className="mt-4">
       <Tabs defaultValue="actual" className="w-full">
         <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="actual">Semana Actual</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Generar Nueva Semana
            </Button>
         </div>
        
        <TabsContent value="actual">
             <Card>
                <CardHeader>
                    <CardTitle>Planilla de Pagos: 15/07/2024 al 21/07/2024</CardTitle>
                    <CardDescription>
                    Resumen de pagos a empleados y proveedores para la semana en curso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
                        <p className="text-muted-foreground">Aquí se mostrará el resumen de la semana actual.</p>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                    <p className="text-sm text-muted-foreground">Estado de la semana: <span className="font-semibold text-green-500">Abierta</span></p>
                    <div className="flex gap-2">
                        <Button variant="outline">Cerrar y Contabilizar</Button>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar Planilla
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="historial">
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Planillas Semanales</CardTitle>
                    <CardDescription>
                    Consulte las planillas de semanas anteriores. Las semanas cerradas solo pueden ser modificadas por un administrador.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Semana</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historicalWeeks.map(week => (
                                    <TableRow key={week.id}>
                                        <TableCell className="font-medium">{week.range}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{week.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isAdmin ? (
                                                <Button variant="outline" size="sm">
                                                    <FilePenLine className="mr-2 h-4 w-4" />
                                                    Editar
                                                </Button>
                                            ) : (
                                                 <Button variant="outline" size="sm">
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
