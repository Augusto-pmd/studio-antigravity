'use client';

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useUser } from "@/firebase/provider";
import { Loader2 } from "lucide-react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-col w-full">
              <AppHeader />
              <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                  {children}
              </main>
          </div>
      </div>
    </SidebarProvider>
  );
}
