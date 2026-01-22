import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider } from "@/context/user-context";
import { FirebaseClientProvider } from "@/firebase";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <UserProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-muted/40">
              <AppSidebar />
              <div className="flex flex-col w-full">
                  <AppHeader />
                  <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                      {children}
                  </main>
              </div>
          </div>
        </SidebarProvider>
      </UserProvider>
    </FirebaseClientProvider>
  );
}
