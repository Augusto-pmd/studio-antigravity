'use client';

import { useMemo } from "react";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, HardHat, Truck, ShoppingCart } from "lucide-react";
import { useUser } from "@/context/user-context";
import { useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { FundRequest } from "@/lib/types";

export default function PagoSemanalPage() {
  const { user, permissions, firestore } = useUser();
  const isAdmin = permissions.canValidate;

  const fundRequestsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const baseQuery = collection(firestore, 'fundRequests');
    if (isAdmin) {
      return query(baseQuery);
    }
    return query(baseQuery, where('requesterId', '==', user.uid));
  }, [user, firestore, isAdmin]);

  const { data: requests, isLoading } = useCollection<FundRequest>(fundRequestsQuery);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  };
  
  const totals = useMemo(() => {
    const initialTotals = {
        employees: 0,
        contractors: 0,
        logistics: 0,
        materials: 0,
    };

    if (!requests) return initialTotals;

    return requests.reduce((acc, req) => {
        if (req.status === 'Aprobado' || req.status === 'Pagado') {
            switch(req.category) {
                case 'Logística y PMD':
                case 'Viáticos':
                case 'Caja Chica':
                case 'Otros':
                    acc.logistics += req.currency === 'ARS' ? req.amount : req.amount * req.exchangeRate;
                    break;
                case 'Materiales':
                    acc.materials += req.currency === 'ARS' ? req.amount : req.amount * req.exchangeRate;
                    break;
            }
        }
        return acc;
    }, initialTotals);

  }, [requests]);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Planilla de Pago Semanal</h1>
        <RequestFundDialog />
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
            <div className="text-2xl font-bold font-mono">{formatCurrency(totals.employees, 'ARS')}</div>
            <p className="text-xs text-muted-foreground">Total a pagar en salarios.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratistas</CardTitle>
            <HardHat className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(totals.contractors, 'ARS')}</div>
            <p className="text-xs text-muted-foreground">Pagos por certificados de obra.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logística y PMD</CardTitle>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(totals.logistics, 'ARS')}</div>
            <p className="text-xs text-muted-foreground">Pedidos de caja para viáticos y otros.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiales</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(totals.materials, 'ARS')}</div>
            <p className="text-xs text-muted-foreground">Pedidos de caja para compra de materiales.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Solicitudes de Fondos</CardTitle>
        </CardHeader>
        <CardContent>
          <FundRequestsTable requests={requests} isLoading={isLoading} />
        </CardContent>
      </Card>

    </div>
  );
}
