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
import type { Expense, Project, Supplier } from "@/lib/types";
import { parseISO, format as formatDateFns } from 'date-fns';
import { useFirestore, useCollection } from "@/firebase";
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { expenseCategories } from "@/lib/data";
import { useMemo } from "react";

const formatCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateFns(parseISO(dateString), 'dd/MM/yyyy');
}

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

export function ExpensesTable() {
  const firestore = useFirestore();

  const expensesQuery = useMemo(() => (
    firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null
  ), [firestore]);
  
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const projectsMap = useMemo(() => {
    if (!projects) return {};
    return projects.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const suppliersMap = useMemo(() => {
    if (!suppliers) return {};
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);
  }, [suppliers]);

  const getCategoryName = (categoryId: string) => expenseCategories.find(c => c.id === categoryId)?.name || categoryId;

  const isLoading = isLoadingExpenses || isLoadingProjects || isLoadingSuppliers;

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && expenses?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay gastos registrados. Comience creando uno nuevo.
                  </TableCell>
                </TableRow>
              )}
              {expenses?.map((expense: Expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-medium">{projectsMap[expense.projectId] || expense.projectId}</div>
                    <div className="text-sm text-muted-foreground">{getCategoryName(expense.categoryId)}</div>
                    <div className="text-sm text-muted-foreground md:hidden mt-2">
                      <p>{suppliersMap[expense.supplierId] || expense.supplierId}</p>
                      <p>{formatDate(expense.date)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{suppliersMap[expense.supplierId] || expense.supplierId}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(expense.date)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
