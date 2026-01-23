'use client';

import { Banknote, BotMessageSquare, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreasuryAccounts } from "@/components/tesoreria/treasury-accounts";
import { BankStatementAnalyzer } from "@/components/contabilidad/bank-statement-analyzer";
import { useUser } from "@/context/user-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TesoreriaPage() {
  const { permissions, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!permissions.isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No tienes los permisos necesarios para acceder a esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-headline">Tesorería</h1>
      <p className="text-muted-foreground">
        Gestión de las cuentas de dinero centrales de la empresa, conciliaciones y movimientos de fondos.
      </p>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cuentas">
            <Banknote className="mr-2 h-4 w-4" />
            Cuentas Centrales
          </TabsTrigger>
          <TabsTrigger value="analisis">
            <BotMessageSquare className="mr-2 h-4 w-4" />
            Análisis con IA
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cuentas" className="mt-6">
          <TreasuryAccounts />
        </TabsContent>
        <TabsContent value="analisis" className="mt-6">
          <BankStatementAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
