
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { type ReactNode, useEffect } from 'react';
import { useUser } from '@/firebase';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // Don't show the main layout on the login or print pages
  if (pathname === '/login' || pathname === '/imprimir-recibos') {
    return <>{children}</>;
  }
  
  // While user is loading, or if there is no user (before redirect kicks in), show a loading screen.
  if (isUserLoading || !user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <p>Cargando sesión...</p>
        </div>
    )
  }

  // If we have a user, show the app shell
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
