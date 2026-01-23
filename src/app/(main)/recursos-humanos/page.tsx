'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalOfficeEmployeeDialog } from "@/components/recursos-humanos/technical-office-employee-dialog";
import { TechnicalOfficeEmployeesTable } from "@/components/recursos-humanos/technical-office-employees-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, BarChart2, CalendarClock, UserCog, Loader2 } from "lucide-react";
import { SalaryReports } from "@/components/recursos-humanos/salary-reports";
import { useUser } from "@/firebase";

export default function RecursosHumanosPage() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Recursos Humanos (Oficina Técnica)</h1>
      </div>
      <p className="text-muted-foreground">
        Gestión de salarios, costos y productividad del personal de la oficina técnica.
      </p>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="personal">
            <UserCog className="mr-2 h-4 w-4" />
            Personal y Salarios
          </TabsTrigger>
          <TabsTrigger value="horas">
            <CalendarClock className="mr-2 h-4 w-4" />
            Horas por Obra
          </TabsTrigger>
          <TabsTrigger value="reportes">
            <BarChart2 className="mr-2 h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                        Administre el personal de la oficina y sus salarios mensuales.
                    </p>
                    <TechnicalOfficeEmployeeDialog>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo Empleado
                        </Button>
                    </TechnicalOfficeEmployeeDialog>
                </div>
                <TechnicalOfficeEmployeesTable />
            </div>
        </TabsContent>
        <TabsContent value="horas" className="mt-6">
           <div className="flex h-64 items-center justify-center rounded-md border border-dashed">
                <p className="text-muted-foreground">Próximamente: Dashboard de horas cargadas por obra.</p>
            </div>
        </TabsContent>
        <TabsContent value="reportes" className="mt-6">
           <SalaryReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
