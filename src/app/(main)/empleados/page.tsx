import { AddEmployeeDialog } from "@/components/empleados/add-employee-dialog";
import { EmployeesTable } from "@/components/empleados/employees-table";

export default function EmpleadosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Empleados</h1>
        <AddEmployeeDialog />
      </div>
      <EmployeesTable />
    </div>
  );
}
