'use client';

import { useState, useMemo } from 'react';
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ProjectExpenseSummary } from "@/components/expenses/project-expense-summary";
import { useUser, useCollection, useFirestore } from "@/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project, Supplier, Expense, TimeLog, TechnicalOfficeEmployee } from '@/lib/types';
import { expenseCategories } from '@/lib/data';

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => ({ ...snapshot.data(options), id: snapshot.id } as TimeLog)
};

const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => ({ ...snapshot.data(options), id: snapshot.id } as TechnicalOfficeEmployee)
};

export default function GastosPage() {
  const { permissions } = useUser();
  const firestore = useFirestore();

  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  // Data for summary
  const allExpensesQuery = useMemo(() => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null), [firestore]);
  const { data: allExpenses, isLoading: isLoadingAllExpenses } = useCollection<Expense>(allExpensesQuery);

  const allTimeLogsQuery = useMemo(() => (firestore ? collection(firestore, 'timeLogs').withConverter(timeLogConverter) : null), [firestore]);
  const { data: allTimeLogs, isLoading: isLoadingAllTimeLogs } = useCollection<TimeLog>(allTimeLogsQuery);

  const techOfficeEmployeesQuery = useMemo(() => (firestore ? collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter) : null), [firestore]);
  const { data: techOfficeEmployees, isLoading: isLoadingTechOffice } = useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

  const { summary, isLoading: isLoadingSummary } = useMemo(() => {
    const isLoading = isLoadingAllExpenses || isLoadingAllTimeLogs || isLoadingTechOffice;

    if (!selectedProject || !allExpenses || !allTimeLogs || !techOfficeEmployees) {
      return { summary: null, isLoading };
    }

    const projectExpenses = allExpenses.filter((e: Expense) => e.projectId === selectedProject);

    const materialesCost = projectExpenses
      .filter((e: Expense) => e.categoryId === 'CAT-01')
      .reduce((sum, e) => sum + (e.currency === 'USD' && e.exchangeRate ? e.amount * e.exchangeRate : e.amount), 0);

    const manoDeObraCost = projectExpenses
      .filter((e: Expense) => e.categoryId === 'CAT-02')
      .reduce((sum, e) => sum + (e.currency === 'USD' && e.exchangeRate ? e.amount * e.exchangeRate : e.amount), 0);
      
    const employeeSalaryMap = new Map(techOfficeEmployees.map((e: TechnicalOfficeEmployee) => [e.userId, e.monthlySalary]));
    const projectTimeLogs = allTimeLogs.filter((log: TimeLog) => log.projectId === selectedProject);

    const horasOficinaTecnicaCost = projectTimeLogs.reduce((total, log) => {
        const salary = employeeSalaryMap.get(log.userId);
        if (!salary) return total;
        // Assume 160 working hours in a month. This is a reasonable assumption for a prototype.
        const hourlyRate = salary / 160;
        return total + (log.hours * hourlyRate);
    }, 0);

    return { 
        summary: {
            materialesCost,
            manoDeObraCost,
            horasOficinaTecnicaCost,
        },
        isLoading: false
    };

  }, [selectedProject, allExpenses, allTimeLogs, techOfficeEmployees, isLoadingAllExpenses, isLoadingAllTimeLogs, isLoadingTechOffice]);


  const resetFilters = () => {
    setSelectedProject(undefined);
    setSelectedSupplier(undefined);
    setSelectedCategory(undefined);
  }

  const hasActiveFilters = selectedProject || selectedSupplier || selectedCategory;

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

      {selectedProject && (
        <ProjectExpenseSummary summary={summary} isLoading={isLoadingSummary} />
      )}
      
      <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row">
        <h3 className="hidden shrink-0 font-semibold tracking-tight md:block mt-2">Filtros:</h3>
        <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Select onValueChange={(value) => setSelectedProject(value === 'all' ? undefined : value)} value={selectedProject}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Obra" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las Obras</SelectItem>
                    {isLoadingProjects ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                        projects?.map((p: Project) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedSupplier(value === 'all' ? undefined : value)} value={selectedSupplier}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Proveedor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Proveedores</SelectItem>
                     {isLoadingSuppliers ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                        suppliers?.map((s: Supplier) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)} value={selectedCategory}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Rubro" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Rubros</SelectItem>
                    {expenseCategories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar Filtros
                </Button>
            )}
        </div>
      </div>

      <ExpensesTable 
        projectId={selectedProject}
        supplierId={selectedSupplier}
        categoryId={selectedCategory}
      />
    </div>
  );
}
