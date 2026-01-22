import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";

export default function GastosPage() {
  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Gastos por Obra</h1>
        <AddExpenseDialog />
      </div>
      <ExpensesTable />
    </div>
  );
}

    