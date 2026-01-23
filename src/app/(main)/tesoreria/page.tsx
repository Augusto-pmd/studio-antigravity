'use client';

import { Banknote, BotMessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreasuryAccounts } from "@/components/tesoreria/treasury-accounts";
import { BankStatementAnalyzer } from "@/components/contabilidad/bank-statement-analyzer";

export default function TesoreriaPage() {
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
