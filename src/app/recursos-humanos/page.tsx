import { SalaryReports } from "@/components/recursos-humanos/salary-reports";
import { TechnicalOfficeEmployeeDialog } from "@/components/recursos-humanos/technical-office-employee-dialog";
import { TechnicalOfficeEmployeesTable } from "@/components/recursos-humanos/technical-office-employees-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function RecursosHumanosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
            <h1 className="text-3xl font-headline">Recursos Humanos (Oficina Técnica)</h1>
            <p className="text-muted-foreground">Gestión de salarios y personal de la oficina técnica.</p>
        </div>
        <TechnicalOfficeEmployeeDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Empleado
            </Button>
        </TechnicalOfficeEmployeeDialog>
      </div>
      
      <TechnicalOfficeEmployeesTable />

      <SalaryReports />
    </div>
  );
}
