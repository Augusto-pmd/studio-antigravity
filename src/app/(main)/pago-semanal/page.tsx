'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users, HardHat, Truck, ShoppingCart } from "lucide-react";

export default function PagoSemanalPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Planilla de Pago Semanal</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Solicitar Dinero
        </Button>
      </div>

      <p className="text-muted-foreground">
        Aquí se consolida toda la plata necesaria para cubrir los gastos de la semana. Incluye pagos a empleados, contratistas y solicitudes de caja para logística, materiales y otros gastos.
      </p>

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
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">Aquí se mostrará la tabla con todas las solicitudes.</p>
            </div>
        </CardContent>
      </Card>


    </div>
  );
}
