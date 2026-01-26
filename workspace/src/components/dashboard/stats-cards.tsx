'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Landmark, CircleDollarSign, Receipt } from "lucide-react";

const formatCurrency = (amount: number, currency?: string) => {
    if (typeof amount !== 'number') return '';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency || 'ARS',
        maximumFractionDigits: 0,
    };
    return new Intl.NumberFormat('es-AR', options).format(amount);
};

interface StatCard {
    title: string;
    value: string;
    icon: React.ReactNode;
    change: string;
}

export function StatsCards() {
    const statCards: StatCard[] = [
        {
          title: "Facturación Anual (Ejercicio 2024)",
          value: formatCurrency(240815813),
          icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
          change: "Ventas netas de bienes y servicios",
        },
        {
          title: "Resultado del Ejercicio (2024)",
          value: formatCurrency(27357062),
          icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
          change: "Ganancia neta después de impuestos",
        },
        {
          title: "Activo Total al 31/12/2024",
          value: formatCurrency(64596850),
          icon: <Landmark className="h-5 w-5 text-muted-foreground" />,
          change: "Total de bienes y derechos de la empresa",
        },
      ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat: StatCard) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
