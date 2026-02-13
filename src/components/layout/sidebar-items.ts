import {
    LayoutDashboard,
    Briefcase,
    Receipt,
    Users,
    HardHat,
    Wallet,
    Settings,
    FileText,
    Database
} from "lucide-react";

export const SIDEBAR_ITEMS = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        variant: "default"
    },
    {
        title: "Obras",
        href: "/obras",
        icon: HardHat,
        variant: "ghost"
    },
    {
        title: "Gastos",
        href: "/gastos",
        icon: Receipt,
        variant: "ghost"
    },
    {
        title: "Caja",
        href: "/caja",
        icon: Wallet,
        variant: "ghost"
    },
    {
        title: "Personal",
        href: "/personal",
        icon: Users,
        variant: "ghost"
    },
    {
        title: "Migración",
        href: "/migracion",
        icon: Database,
        variant: "ghost"
    },
    {
        title: "Configuración",
        href: "/configuracion",
        icon: Settings,
        variant: "ghost"
    }
];
