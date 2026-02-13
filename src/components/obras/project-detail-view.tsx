'use client';

import { useMemo } from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Project, Supplier } from '@/lib/types';
import { projectConverter, supplierConverter } from '@/lib/converters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ExpensesTable } from '@/components/expenses/expenses-table';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProjectExpenses } from '@/hooks/use-project-expenses';
import { ProjectExpenseSummary } from './project-expense-summary';

const formatCurrency = (amount: number, currency: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const firestore = useFirestore();

  const projectDocRef = useMemo(
    () =>
      firestore
        ? doc(firestore, 'projects', projectId).withConverter(projectConverter)
        : null,
    [firestore, projectId]
  );
  const { data: project, isLoading: isLoadingProject } = useDoc<Project>(projectDocRef);

  const { expenses, isLoading: isLoadingExpenses } = useProjectExpenses(projectId);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const suppliersMap = useMemo(() => {
    const map: Record<string, string> = suppliers?.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.id]: s.name }), {}) || {};
    map['OFICINA-TECNICA'] = 'Oficina Técnica';
    map['personal-propio'] = 'Personal Propio';
    map['solicitudes-fondos'] = 'Solicitudes de Fondos (Interno)';
    map['logistica-vial'] = 'Gastos de Caja (Rápidos)';
    return map;
  }, [suppliers]);

  const projectsMap = useMemo(() => {
    if (!project) return {};
    return { [project.id]: project.name };
  }, [project]);

  const isLoading = isLoadingProject || isLoadingExpenses || isLoadingSuppliers;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Obra no encontrada
        </p>
        <p className="text-sm text-muted-foreground">
          La obra que busca no existe o fue eliminada.
        </p>
        <Button asChild>
          <Link href="/obras">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Obras
          </Link>
        </Button>
      </div>
    );
  }

  const totalCostARS = expenses.reduce((sum, exp) => {
    const amount =
      exp.currency === 'USD' ? exp.amount * exp.exchangeRate : exp.amount;
    return sum + amount;
  }, 0);

  const totalCostUSD = expenses.reduce((sum, exp) => {
    const exchangeRate = exp.exchangeRate || 1;
    const amount =
      exp.currency === 'ARS' ? exp.amount / exchangeRate : exp.amount;
    return sum + amount;
  }, 0);

  const isBudgetInARS = project.currency === 'ARS';
  const remainingBalance = isBudgetInARS
    ? project.budget - totalCostARS
    : project.budget - totalCostUSD;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-4">
            <Link href="/obras">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Obras
            </Link>
          </Button>
          <h1 className="text-3xl font-headline">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.client} - {project.address}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'w-fit capitalize',
            project.status === 'En Curso' &&
            'bg-green-900/40 text-green-300 border-green-700',
            project.status === 'Pausado' &&
            'bg-yellow-900/40 text-yellow-300 border-yellow-700',
            project.status === 'Completado' &&
            'bg-blue-900/40 text-blue-300 border-blue-700',
            project.status === 'Cancelado' &&
            'bg-red-900/40 text-red-300 border-red-700'
          )}
        >
          {project.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.budget, project.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Gasto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCostARS, 'ARS')}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(totalCostUSD, 'USD')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", remainingBalance < 0 && "text-red-500")}>
              {formatCurrency(remainingBalance, project.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectExpenseSummary
        expenses={expenses}
        totalProjectCostARS={totalCostARS}
        suppliersMap={suppliersMap}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Listado de Gastos</h2>
        <AddExpenseDialog projectId={projectId}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Cargar Gasto
          </Button>
        </AddExpenseDialog>
      </div>

      <ExpensesTable
        expenses={expenses}
        isLoading={isLoading}
        projectsMap={projectsMap}
        suppliersMap={suppliersMap}
        hideProjectColumn={true}
      />
    </div>
  );
}
