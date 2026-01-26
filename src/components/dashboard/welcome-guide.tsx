import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Receipt,
  Wallet,
  CalendarCheck,
  Bell,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { AiAssistant } from "./ai-assistant";

const guideItems = [
  {
    href: "/obras",
    icon: Building2,
    title: "Obras",
    description: "Gestione todas las obras, sus presupuestos, estados y progreso.",
  },
  {
    href: "/gastos",
    icon: Receipt,
    title: "Gastos por Obra",
    description: "Registre y consulte todos los gastos asociados a las obras.",
  },
  {
    href: "/caja",
    icon: Wallet,
    title: "Mi Caja",
    description: "Administre el efectivo, registre gastos rápidos y vea su saldo.",
  },
  {
    href: "/asistencias",
    icon: CalendarCheck,
    title: "Asistencias",
    description: "Registre la asistencia diaria del personal de obra.",
  },
  {
    href: "/pedidos-y-alertas",
    icon: Bell,
    title: "Pedidos y Alertas",
    description: "Cree y de seguimiento a las tareas y pedidos entre el equipo.",
  },
  {
    href: "/mis-horas",
    icon: Clock,
    title: "Mis Horas",
    description: "Registre las horas dedicadas a cada proyecto por día.",
  },
];

export function WelcomeGuide() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-headline">Bienvenido a PMD Manager</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Una guía rápida de las herramientas a tu disposición.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {guideItems.map((item) => (
                <Link href={item.href} key={item.href} className="flex">
                    <Card className="flex w-full flex-col transition-all hover:bg-muted/50 hover:shadow-lg">
                    <CardHeader className="flex-row items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                        <item.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                        <CardTitle>{item.title}</CardTitle>
                        <CardDescription className="mt-1">
                            {item.description}
                        </CardDescription>
                        </div>
                    </CardHeader>
                    </Card>
                </Link>
                ))}
            </div>
        </div>
        <div className="lg:col-span-1">
            <AiAssistant />
        </div>
      </div>
    </div>
  );
}
