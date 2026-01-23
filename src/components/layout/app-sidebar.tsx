'use client';

import { usePathname, useRouter } from "next/navigation";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
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
  Contact,
  CalendarCheck,
  MoreHorizontal,
  CircleDollarSign,
  Bell,
  Archive,
  HardHat,
  User as UserIcon,
  BookText,
  Briefcase,
  Clock,
  Scale,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAuth, signOut } from 'firebase/auth';
import { useState } from "react";
import { EditProfileDialog } from "../profile/edit-profile-dialog";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/proveedores", label: "Proveedores", icon: Users },
  { href: "/empleados", label: "Empleados", icon: Contact },
  { href: "/contratistas", label: "Contratistas", icon: HardHat },
  { href: "/asistencias", label: "Asistencias", icon: CalendarCheck },
  { href: "/pago-semanal", label: "Pago Semanal", icon: CircleDollarSign },
  { href: "/pedidos-y-alertas", label: "Pedidos y Alertas", icon: Bell },
  { href: "/mis-horas", label: "Mis Horas", icon: Clock },
  { href: "/caja", label: "Mi Caja", icon: Wallet },
  {
    href: "/cajas",
    label: "Gestión de Cajas",
    icon: Landmark,
    role: ["Dirección", "Administración"],
  },
  { href: "/gastos", label: "Gastos por Obra", icon: Receipt },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/contabilidad", label: "Contabilidad", icon: BookText },
  {
    href: "/tesoreria",
    label: "Tesorería",
    icon: Scale,
    role: ["Dirección", "Administración"],
  },
  {
    href: "/recursos-humanos",
    label: "Recursos Humanos",
    icon: Briefcase,
    role: ["Dirección"],
  },
];

const roles: Role[] = ["Dirección", "Supervisor", "Administración", "Operador"];


export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, setRole } = useUser();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  };

  return (
    <>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <Logo className="h-auto w-full max-w-[120px]" />
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
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'Avatar'} />
                              <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-left group-data-[collapsible=icon]:hidden">
                              <p className="font-semibold text-sm text-sidebar-foreground truncate">{user?.displayName}</p>
                              <p className="text-xs text-sidebar-foreground/70">{role}</p>
                          </div>
                      </div>
                      <MoreHorizontal className="ml-auto h-5 w-5 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56 mb-2">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)}>
                      <UserIcon className="mr-2 h-4 w-4"/>
                      <span>Editar Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Cambiar Rol (Simulación)</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
                      {roles.map((r) => (
                        <DropdownMenuRadioItem key={r} value={r}>
                          {r}
                        </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4"/>
                      Cerrar Sesión
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <EditProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );
}
