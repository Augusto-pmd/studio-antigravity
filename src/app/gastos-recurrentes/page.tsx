'use client';

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { RecurringExpenseDialog } from "@/components/gastos-recurrentes/recurring-expense-dialog";
import { RecurringExpensesTable } from "@/components/gastos-recurrentes/recurring-expenses-table";
import { useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function GastosRecurrentesPage() {
  const { permissions } = useUser();

  if (!permissions.canValidate) {
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gastos Recurrentes</h1>
          <p className="mt-1 text-muted-foreground">
            Gestione los gastos fijos y recurrentes de la oficina que no están atados a una obra.
          </p>
        </div>
        <RecurringExpenseDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Gasto Recurrente
          </Button>
        </RecurringExpenseDialog>
      </div>
      <RecurringExpensesTable />
    </div>
  );
}
