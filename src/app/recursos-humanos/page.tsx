'use client';

import { SalaryReports } from "@/components/recursos-humanos/salary-reports";
import { TechnicalOfficeEmployeeDialog } from "@/components/recursos-humanos/technical-office-employee-dialog";
import { GenerateSalariesDialog } from "@/components/recursos-humanos/generate-salaries-dialog";
import { TechnicalOfficeEmployeesTable } from "@/components/recursos-humanos/technical-office-employees-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function RecursosHumanosPage() {
  const { permissions } = useUser();

  if (!permissions.isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-medium text-muted-foreground">Acceso Denegado</p>
          <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline">Recursos Humanos (Oficina Técnica)</h1>
          <p className="text-muted-foreground">Gestión de salarios y personal de la oficina técnica.</p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateSalariesDialog>
            <Button variant="outline">Generar Liquidaciones</Button>
          </GenerateSalariesDialog>
          <TechnicalOfficeEmployeeDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Button>
          </TechnicalOfficeEmployeeDialog>
        </div>
      </div>

      <TechnicalOfficeEmployeesTable />

      <SalaryReports />
    </div>
  );
}
