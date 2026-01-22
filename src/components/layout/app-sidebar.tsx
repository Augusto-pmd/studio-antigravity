"use client";

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
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/user-context";
import {
  Building2,
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
  Receipt,
  FileText,
  Landmark,
} from "lucide-react";
import { Badge } from "../ui/badge";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/cajas", label: "Cajas", icon: Wallet, role: ["Operador", "Administración", "Dirección"] },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/proveedores", label: "Proveedores", icon: Users },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/contabilidad", label: "Contabilidad", icon: Landmark },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useUser();

  return (
    <Sidebar>
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
                  tooltip={{ children: item.label }}
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
      <SidebarFooter className="flex flex-col gap-4">
        <Separator />
        <div className="flex flex-col gap-2 items-center text-center group-data-[collapsible=icon]:hidden">
           <Users className="w-8 h-8 text-muted-foreground" />
           <p className="text-sm font-medium">Usuario Actual</p>
           <Badge variant="outline">{role}</Badge>
        </div>
         <SidebarMenuButton tooltip={{children: 'Cerrar Sesión'}}>
            <LogOut />
            <span>Cerrar Sesión</span>
         </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
