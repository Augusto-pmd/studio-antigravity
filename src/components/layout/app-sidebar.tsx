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
  SidebarMenuBadge,
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
import { Separator } from "@/components/ui/separator";
import { useUser, useCollection } from "@/firebase";
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
  UserCog,
  Repeat,
  CalendarDays,
  Warehouse,
  PieChart,
  BarChart,
  Database,
  TrendingUp,
} from "lucide-react";
import type { Role, TaskRequest } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAuth, signOut } from 'firebase/auth';
import { useState, useMemo } from "react";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { collection, query, where, orderBy, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { YearNavigator } from "@/components/ui/year-navigator";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Análisis Financiero", icon: TrendingUp, adminOnly: true },
  { href: "/obras", label: "Obras", icon: Building2, pañoleroHidden: true },
  { href: "/proveedores", label: "Proveedores", icon: Users, pañoleroHidden: true },
  { href: "/empleados", label: "Empleados", icon: Contact, pañoleroHidden: true },
  { href: "/contratistas", label: "Contratistas", icon: HardHat, pañoleroHidden: true },
  { href: "/activos", label: "Activos", icon: Archive, pañoleroHidden: true },
  { href: "/stock", label: "Stock Pañol", icon: Warehouse },
  { href: "/resumen-semanal", label: "Resumen Semanal", icon: PieChart, pañoleroHidden: true },
  { href: "/pago-semanal", label: "Pago Semanal", icon: CircleDollarSign, pañoleroHidden: true },
  { href: "/pedidos-y-alertas", label: "Pedidos y Alertas", icon: Bell },
  { href: "/mis-horas", label: "Mis Horas", icon: Clock },
  { href: "/caja", label: "Mi Caja", icon: Wallet, pañoleroHidden: true },
  { href: "/ventas", label: "Ventas", icon: FileText, pañoleroHidden: true },
  { href: "/contabilidad", label: "Contabilidad", icon: BookText, pañoleroHidden: true },
  {
    href: "/calendario-pagos",
    label: "Calendario de Pagos",
    icon: CalendarDays,
    pañoleroHidden: true,
  },
  {
    href: "/gastos-recurrentes",
    label: "Gastos Recurrentes",
    icon: Repeat,
    pañoleroHidden: true,
  },
  {
    href: "/recursos-humanos",
    label: "Recursos Humanos",
    icon: Briefcase,
    adminOnly: true,
    pañoleroHidden: true,
  },
  {
    href: "/tesoreria",
    label: "Tesorería",
    icon: Scale,
    adminOnly: true,
    pañoleroHidden: true,
  },
  {
    href: "/auditoria",
    label: "Auditoría",
    icon: BarChart,
    adminOnly: true,
    pañoleroHidden: true,
  },
  {
    href: "/cajas",
    label: "Gestión de Cajas",
    icon: Landmark,
    pañoleroHidden: true,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: UserCog,
    adminOnly: true,
    pañoleroHidden: true,
  },
];

const taskRequestConverter = {
  toFirestore: (data: TaskRequest): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TaskRequest => ({ ...snapshot.data(options), id: snapshot.id } as TaskRequest)
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, permissions, auth, firestore } = useUser();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const pendingTasksQuery = useMemo(() => {
    if (!user || !firestore) return null;

    const tasksCollection = collection(firestore, 'taskRequests').withConverter(taskRequestConverter);

    if (permissions.canSupervise) {
      return query(tasksCollection, where('status', '==', 'Pendiente'));
    }

    return query(
      tasksCollection,
      where('assigneeId', '==', user.uid),
      where('status', '==', 'Pendiente')
    );
  }, [user, firestore, permissions.canSupervise]);

  const { data: pendingTasks } = useCollection<TaskRequest>(pendingTasksQuery);
  const pendingTasksCount = pendingTasks?.length || 0;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <>
      <Sidebar variant="floating" collapsible="icon" className="m-4 ml-4 md:ml-4 h-[calc(100svh-2rem)] rounded-[2rem] border-0 shadow-glass bg-sidebar/70 backdrop-blur-3xl transition-all duration-500 hover:shadow-glass-hover">
        <SidebarHeader className="p-6 pb-2">
          <Logo className="h-auto w-full max-w-[120px] transition-transform duration-300 hover:scale-105" />
          <div className="mt-4">
            <YearNavigator />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              if (role === 'Pañolero' && item.pañoleroHidden) {
                return null;
              }

              if (item.adminOnly && !permissions.isSuperAdmin) {
                return null;
              }

              if (item.href === '/cajas' && !permissions.canSupervise) {
                return null;
              }

              if (item.href === '/activos' && !permissions.canValidate && !permissions.canSupervise) {
                return null;
              }

              if (item.href === '/dashboard/analytics' && role !== 'Dirección') {
                return null;
              }

              const adminValidationRoutes = ['/contabilidad', '/calendario-pagos', '/gastos-recurrentes'];
              if (adminValidationRoutes.includes(item.href) && !permissions.canValidate) {
                return null;
              }

              const isPedidos = item.href === "/pedidos-y-alertas";

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                    className="rounded-full px-5 py-3 h-12 transition-all duration-300 hover:bg-sidebar-accent/50 hover:pl-7 data-[active=true]:bg-primary/15 data-[active=true]:text-primary font-medium"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-base">{item.label}</span>
                      {isPedidos && pendingTasksCount > 0 && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 px-1.5 ml-auto">
                          {pendingTasksCount}
                        </SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="flex flex-col gap-2 p-4">
          <Separator className="bg-sidebar-border/50" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-14 w-full justify-start px-3 py-2 rounded-2xl hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:w-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 transition-all duration-300">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                    <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'Avatar'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{user?.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left group-data-[collapsible=icon]:hidden flex-1 overflow-hidden">
                    <p className="font-semibold text-sm text-sidebar-foreground truncate tracking-tight">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{role}</p>
                  </div>
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-60 mb-2 rounded-2xl shadow-glass border-0 bg-white/80 backdrop-blur-xl p-2">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer p-3">
                <UserIcon className="mr-3 h-4 w-4" />
                <span className="font-medium">Editar Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50 my-1" />
              <DropdownMenuItem onSelect={handleLogout} className="rounded-xl focus:bg-destructive/10 focus:text-destructive cursor-pointer p-3 text-destructive">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <EditProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );
}
