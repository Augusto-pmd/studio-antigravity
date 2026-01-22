import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

export default function GastosPage() {
  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Gastos por Obra</h1>
        <AddExpenseDialog />
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Aquí se mostrará la tabla con todos los gastos registrados.
      </div>
    </div>
  );
}
