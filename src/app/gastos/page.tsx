'use client';

import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { useUser } from "@/firebase";

export default function GastosPage() {
  const { permissions } = useUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Gastos</h1>
          <p className="mt-1 text-muted-foreground">
            Registre y consulte todos los gastos asociados a las obras.
          </p>
        </div>
        {permissions.canLoadExpenses && <AddExpenseDialog />}
      </div>
      <ExpensesTable />
    </div>
  );
}
