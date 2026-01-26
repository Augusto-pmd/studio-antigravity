
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, HardHat, Wrench } from "lucide-react";

interface ProjectExpenseSummaryProps {
  summary: {
    horasOficinaTecnicaCost: number;
    manoDeObraCost: number;
    materialesCost: number;
  } | null;
  isLoading: boolean;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return 'ARS 0,00';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function ProjectExpenseSummary({ summary, isLoading }: ProjectExpenseSummaryProps) {
  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
        </div>
    );
  }
  
  if (!summary) {
    return null;
  }

  const summaryCards = [
    { title: "Horas Oficina Técnica", value: summary.horasOficinaTecnicaCost, icon: Briefcase },
    { title: "Mano de Obra", value: summary.manoDeObraCost, icon: HardHat },
    { title: "Materiales", value: summary.materialesCost, icon: Wrench },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(card.value)}</div>
                </CardContent>
            </Card>
        ))}
    </div>
  );
}
