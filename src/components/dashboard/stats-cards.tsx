import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, CircleDollarSign, Receipt } from "lucide-react";

export function StatsCards() {
  const stats = [
    {
      title: "Obras en Curso",
      value: "5",
      icon: <Building2 className="h-5 w-5 text-muted-foreground" />,
      change: "+2 este mes",
    },
    {
      title: "Saldo Total Contratos",
      value: "$1,500,000",
      icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
      change: "ARS",
    },
    {
      title: "Gastos del Mes",
      value: "$125,300",
      icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
      change: "-8.5% vs mes anterior",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
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
