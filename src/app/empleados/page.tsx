import { EmployeeDialog } from "@/components/empleados/employee-dialog";
import { EmployeesTable } from "@/components/empleados/employees-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function EmpleadosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Empleados</h1>
         <EmployeeDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Empleado
            </Button>
        </EmployeeDialog>
      </div>
      <p className="text-muted-foreground">
        Administre el personal de la empresa, sus jornales, y el estado de su documentación.
      </p>
      <EmployeesTable />
    </div>
  );
}
