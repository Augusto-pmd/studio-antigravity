'use client';

import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { useUser } from "@/firebase";

export default function GastosPage() {
  const { permissions } = useUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Gestión de Gastos</h1>
        {permissions.canLoadExpenses && <AddExpenseDialog />}
      </div>
      <p className="text-muted-foreground">
        Registre y consulte todos los gastos asociados a las obras.
      </p>
      <ExpensesTable />
    </div>
  );
}
