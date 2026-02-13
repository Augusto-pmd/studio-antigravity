import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import AppShell from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'PMD - V3.1.0 (2026 OK)',
  description: 'Sistema Integral de Gestión de Obras',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=PT+Sans:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased border-t-8 border-red-500">
        <div className="w-full bg-yellow-300 text-black text-center font-bold p-4 text-2xl">SISTEMA ACTUALIZADO 2026</div>
        <FirebaseClientProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </SidebarProvider>
        </FirebaseClientProvider>
        <span className="hidden">Build: {new Date().toISOString()}</span>
      </body>
    </html>
  );
}
