
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

// ... imports
import { useYear } from '@/lib/contexts/year-context';

export function AnalyticsDashboard() {
    const [financials, setFinancials] = useState<ProjectFinancials[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedYear } = useYear(); // Get global year

    // Fetch projects first
    const { data: projects } = useCollection<Project>(
        query(collection(db, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso'))
    );

    // Verify if we already have data to prevent flickering
    const [lastProjectCount, setLastProjectCount] = useState(0);
    // Track last fetched year to force refresh on change
    const [lastFetchedYear, setLastFetchedYear] = useState<number | null>(null);

    useEffect(() => {
        if (!projects || projects.length === 0) {
            setIsLoading(false);
            return;
        }

        // Re-fetch if project count changes OR year changes
        if (projects.length === lastProjectCount && financials.length === projects.length && lastFetchedYear === selectedYear) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);

            try {
                const results = await Promise.all(
                    projects.map(async (project) => {
                        // Pass selectedYear to service
                        const data = await FinancialAnalyticsService.getProjectFinancials(project.id, selectedYear);
                        return { ...data, projectName: project.name };
                    })
                );
                setFinancials(results);
                setLastProjectCount(projects.length);
                setLastFetchedYear(selectedYear);
            } catch (error) {
                console.error("Failed to fetch financials:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projects, selectedYear]); // Add selectedYear dependency

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
