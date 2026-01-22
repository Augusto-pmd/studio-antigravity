'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/user-context";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Building2,
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
  Receipt,
  FileText,
  Landmark,
  Contact,
  CalendarCheck,
  MoreHorizontal,
  CircleDollarSign,
  Bell,
  HardHat,
} from "lucide-react";
import type { Role } from "@/lib/types";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/proveedores", label: "Proveedores", icon: Users },
  { href: "/empleados", label: "Empleados", icon: Contact },
  { href: "/contratistas", label: "Contratistas", icon: HardHat },
  { href: "/asistencias", label: "Asistencias", icon: CalendarCheck },
  { href: "/pago-semanal", label: "Pago Semanal", icon: CircleDollarSign },
  { href: "/pedidos-y-alertas", label: "Pedidos y Alertas", icon: Bell },
  {
    href: "/cajas",
    label: "Cajas",
    icon: Wallet,
    role: ["Operador", "Administración", "Dirección"],
  },
  { href: "/gastos", label: "Gastos por Obra", icon: Receipt },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/contabilidad", label: "Contabilidad", icon: Landmark },
];

const roles: Role[] = ["Dirección", "Supervisor", "Administración", "Operador"];


export function AppSidebar() {
  const pathname = usePathname();
  const { role, setRole } = useUser();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar-1');

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.role && !item.role.includes(role)) {
              return null;
            }
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: "right", align: "center" }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <Separator className="bg-sidebar-border" />
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                    <div className="flex items-center gap-3">
                         {userAvatar && (
                            <Image
                                src={userAvatar.imageUrl}
                                alt={userAvatar.description}
                                data-ai-hint={userAvatar.imageHint}
                                width={32}
                                height={32}
                                className="rounded-full"
                            />
                        )}
                        <div className="text-left group-data-[collapsible=icon]:hidden">
                            <p className="font-semibold text-sm text-sidebar-foreground">Usuario</p>
                            <p className="text-xs text-sidebar-foreground/70">{role}</p>
                        </div>
                    </div>
                     <MoreHorizontal className="ml-auto h-5 w-5 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56 mb-2">
                <DropdownMenuLabel>Cambiar Rol (Simulación)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.map((r) => (
                  <DropdownMenuItem key={r} onSelect={() => setRole(r as Role)}>
                    {r}
                  </DropdownMenuItem>
                ))}
                 <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4"/>
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
