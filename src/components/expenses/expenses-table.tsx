'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Expense, Project, Supplier, ExpenseCategory } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { projects as mockProjects, suppliers as mockSuppliers, expenseCategories } from "@/lib/data";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

export function ExpensesTable() {
  const firestore = useFirestore();

  const expensesQuery = useMemoFirebase(() => (
    firestore ? query(collectionGroup(firestore, 'expenses')) : null
  ), [firestore]);
  
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  // For now, we use mock data for projects and suppliers to enrich the table
  // A more robust solution would be to fetch them from Firestore as well and join them.
  const projects = mockProjects;
  const suppliers = mockSuppliers;

  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || projectId;
  const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.name || supplierId;
  const getCategoryName = (categoryId: string) => expenseCategories.find(c => c.id === categoryId)?.name || categoryId;

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Rubro</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingExpenses && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoadingExpenses && expenses?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay gastos registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {expenses?.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell className="font-medium">{getProjectName(expense.projectId)}</TableCell>
                  <TableCell className="hidden md:table-cell">{getSupplierName(expense.supplierId)}</TableCell>
                  <TableCell className="hidden md:table-cell">{getCategoryName(expense.categoryId)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.documentType}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
