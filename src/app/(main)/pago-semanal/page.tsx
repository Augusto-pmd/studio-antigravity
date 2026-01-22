'use client';

import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Users, HardHat, Truck, ShoppingCart, PlusCircle, Download, FilePenLine, Eye } from "lucide-react";
import { useUser } from "@/context/user-context";

// Mock data for historical weeks
const historicalWeeks = [
  { id: 'week-03', range: '08/07/2024 al 14/07/2024', status: 'Cerrada' },
  { id: 'week-02', range: '01/07/2024 al 07/07/2024', status: 'Cerrada' },
  { id: 'week-01', range: '24/06/2024 al 30/06/2024', status: 'Cerrada' },
];


export default function PagoSemanalPage() {
  const { permissions } = useUser();
  const isAdmin = permissions.canViewAll;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Planilla de Pago Semanal</h1>
        <RequestFundDialog />
      </div>

      <p className="text-muted-foreground">
        Aquí se consolida toda la plata necesaria para cubrir los gastos de la semana. Incluye pagos a empleados, contratistas y solicitudes de caja para logística, materiales y otros gastos.
      </p>

      <Tabs defaultValue="actual" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="actual">Semana Actual</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          {isAdmin && (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Generar Nueva Semana
            </Button>
          )}
        </div>

        <TabsContent value="actual">
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Empleados</CardTitle>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">$ 450,000.00</div>
                  <p className="text-xs text-muted-foreground">Total a pagar en salarios.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contratistas</CardTitle>
                  <HardHat className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">$ 1,200,000.00</div>
                  <p className="text-xs text-muted-foreground">Pagos por certificados de obra.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Logística y PMD</CardTitle>
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">$ 85,500.00</div>
                  <p className="text-xs text-muted-foreground">Pedidos de caja para viáticos y otros.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Materiales</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">$ 230,000.00</div>
                  <p className="text-xs text-muted-foreground">Pedidos de caja para compra de materiales.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detalle de Solicitudes de Caja</CardTitle>
                <CardDescription>
                  Todas las solicitudes de dinero para la semana actual.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FundRequestsTable />
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cierre Semanal: 15/07/2024 al 21/07/2024</CardTitle>
                    <CardDescription>
                      Una vez finalizada la semana, puedes cerrar la planilla para consolidar los pagos y exportar el reporte.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-between">
                    <p className="text-sm text-muted-foreground">Estado de la semana: <span className="font-semibold text-green-500">Abierta</span></p>
                    {isAdmin && (
                      <div className="flex gap-2">
                          <Button variant="outline">Cerrar y Contabilizar</Button>
                          <Button>
                              <Download className="mr-2 h-4 w-4" />
                              Exportar Planilla
                          </Button>
                      </div>
                    )}
                </CardFooter>
            </Card>
          </div>
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
