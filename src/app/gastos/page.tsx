'use client';

import { useState, useMemo } from 'react';
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";
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
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project, Supplier } from '@/lib/types';
import { expenseCategories } from '@/lib/data';

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
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
                        projects?.map((p) => (
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
                        suppliers?.map((s) => (
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
                    {expenseCategories.map((c) => (
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
