
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialAnalyticsService, ProjectFinancials } from '@/services/financial-analytics';
import { Loader2 } from 'lucide-react';
import { ProjectFinancialsTable } from './project-financials-table';
import { FinancialStatsCards } from './financial-stats-cards';
import { IncomeVsCostChart } from './income-vs-cost-chart';
import { AIAnalysisPanel } from './ai-analysis-panel';
import { useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/lib/types';

import { projectConverter } from '@/lib/converters';

export function AnalyticsDashboard() {
    const [financials, setFinancials] = useState<ProjectFinancials[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch projects first
    const { data: projects } = useCollection<Project>(
        query(collection(db, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso'))
    );

    // Verify if we already have data to prevent flickering
    const [lastProjectCount, setLastProjectCount] = useState(0);

    useEffect(() => {
        if (!projects || projects.length === 0) {
            setIsLoading(false);
            return;
        }

        // Avoid re-fetching if we already have the data for the same number of projects
        // This is a simple heuristic. For a real app, one might use a more robust cache key.
        if (projects.length === lastProjectCount && financials.length === projects.length) {
            return;
        }

        const fetchData = async () => {
            // Only show loader on initial fetch
            if (financials.length === 0) setIsLoading(true);

            try {
                const results = await Promise.all(
                    projects.map(async (project) => {
                        // Check if we already have this project cached in state to avoid calling service again? 
                        // For now, let's just fetch but not clear state.
                        const data = await FinancialAnalyticsService.getProjectFinancials(project.id);
                        return { ...data, projectName: project.name };
                    })
                );
                setFinancials(results);
                setLastProjectCount(projects.length);
            } catch (error) {
                console.error("Failed to fetch financials:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projects]);

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const totalIncome = financials.reduce((acc, curr) => acc + curr.income.total, 0);
    const totalCost = financials.reduce((acc, curr) => acc + curr.costs.total, 0);
    const totalProfit = totalIncome - totalCost;

    return (
        <div className="space-y-4">
            <FinancialStatsCards
                totalIncome={totalIncome}
                totalCost={totalCost}
                totalProfit={totalProfit}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Ingresos vs Costos por Obra</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <IncomeVsCostChart data={financials} />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Análisis IA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AIAnalysisPanel financials={financials} />
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="projects" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="projects">Detalle por Obra</TabsTrigger>
                    <TabsTrigger value="categories">Por Categoría</TabsTrigger>
                </TabsList>
                <TabsContent value="projects" className="space-y-4">
                    <ProjectFinancialsTable data={financials} />
                </TabsContent>
                <TabsContent value="categories">
                    <div className="text-muted-foreground p-4">Próximamente: Desglose por categoría de gasto.</div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
