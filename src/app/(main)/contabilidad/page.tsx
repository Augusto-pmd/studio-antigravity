'use client';

import { AccountingDashboard } from '@/components/contabilidad/accounting-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetDialog } from "@/components/activos/asset-dialog";
import { AssetsTable } from "@/components/activos/assets-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookText, Archive, BotMessageSquare } from "lucide-react";
import { BankStatementAnalyzer } from '@/components/contabilidad/bank-statement-analyzer';


export default function ContabilidadPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Contabilidad y Activos</h1>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="dashboard">
            <BookText className="mr-2 h-4 w-4" />
            Dashboard Contable
          </TabsTrigger>
          <TabsTrigger value="activos">
            <Archive className="mr-2 h-4 w-4" />
            Gestión de Activos
          </TabsTrigger>
          <TabsTrigger value="analisis">
            <BotMessageSquare className="mr-2 h-4 w-4" />
            Análisis con IA
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
           <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                Análisis de información fiscal y de gastos para la liquidación de impuestos y toma de decisiones.
              </p>
              <AccountingDashboard />
           </div>
        </TabsContent>
        <TabsContent value="activos" className="mt-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                        Registro y seguimiento de los activos fijos de la compañía.
                    </p>
                    <AssetDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Activo
                    </Button>
                    </AssetDialog>
                </div>
                <AssetsTable />
            </div>
        </TabsContent>
        <TabsContent value="analisis" className="mt-6">
            <BankStatementAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

    
