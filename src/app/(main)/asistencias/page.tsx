'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DailyAttendance } from "@/components/asistencias/daily-attendance";
import { WeeklySummary } from "@/components/asistencias/weekly-summary";
import { CashAdvances } from "@/components/asistencias/cash-advances";
import { CalendarCheck, DollarSign, FileText } from "lucide-react";

export default function AsistenciasPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-headline">Gestión de Asistencias y Pagos</h1>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumen">
            <FileText className="mr-2 h-4 w-4" />
            Planillas Semanales
          </TabsTrigger>
          <TabsTrigger value="registro">
            <CalendarCheck className="mr-2 h-4 w-4" />
            Registro Diario
          </TabsTrigger>
          <TabsTrigger value="adelantos">
            <DollarSign className="mr-2 h-4 w-4" />
            Adelantos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <WeeklySummary />
        </TabsContent>
        <TabsContent value="registro">
          <DailyAttendance />
        </TabsContent>
        <TabsContent value="adelantos">
          <CashAdvances />
        </TabsContent>
      </Tabs>
    </div>
  );
}
