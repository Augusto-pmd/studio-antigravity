'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { type ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show the main layout on the login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

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
