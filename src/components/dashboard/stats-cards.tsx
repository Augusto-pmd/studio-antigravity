'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, CircleDollarSign, Receipt } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { useMemo } from "react";
import { collection, query, where, collectionGroup, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project, Expense } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

const formatCurrency = (amount: number, currency?: string) => {
    if (typeof amount !== 'number') return '';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency || 'ARS',
        maximumFractionDigits: 0,
    };
    return new Intl.NumberFormat('es-AR', options).format(amount);
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

export function StatsCards() {
    const firestore = useFirestore();

    const projectsQuery = useMemo(() => firestore ? query(collection(firestore, 'projects').withConverter(projectConverter)) : null, [firestore]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

    const expensesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter));
    }, [firestore]);
    const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

    const stats = useMemo(() => {
        if (!projects || !allExpenses) {
            return {
                activeProjects: 0,
                totalBalance: 0,
                totalMonthlyExpenses: 0,
            };
        }

        const activeProjects = projects.filter(p => p.status === 'En Curso').length;
        const totalBalance = projects.reduce((acc, p) => p.currency === 'ARS' ? acc + p.balance : acc, 0);

        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const monthlyExpenses = allExpenses.filter(e => {
            try {
                const expenseDate = parseISO(e.date);
                return expenseDate >= start && expenseDate <= end;
            } catch (error) {
                return false;
            }
        });

        const totalMonthlyExpenses = monthlyExpenses.reduce((acc, e) => e.currency === 'ARS' ? acc + e.amount : acc, 0);

        return {
            activeProjects,
            totalBalance,
            totalMonthlyExpenses
        };
    }, [projects, allExpenses]);
    
    const isLoading = isLoadingProjects || isLoadingExpenses;

    const statCards = [
        {
          title: "Obras en Curso",
          value: stats.activeProjects,
          icon: <Building2 className="h-5 w-5 text-muted-foreground" />,
          change: "Proyectos activos",
        },
        {
          title: "Saldo Contratos (ARS)",
          value: formatCurrency(stats.totalBalance),
          icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
          change: "Balance de contratos en ARS",
        },
        {
          title: "Gastos del Mes (ARS)",
          value: formatCurrency(stats.totalMonthlyExpenses),
          icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
          change: "Sumatoria de gastos en ARS",
        },
      ];

  if (isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
      )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
