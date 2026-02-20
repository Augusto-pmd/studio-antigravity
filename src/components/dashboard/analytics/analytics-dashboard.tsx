
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
import { useYear } from '@/lib/contexts/year-context';

export function AnalyticsDashboard() {
    const [financials, setFinancials] = useState<ProjectFinancials[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedYear } = useYear();

    // We want to see financials for all relevant projects, not just active ones, 
    // especially for past years (like 2025/2026 where projects might be completed).
    const projectsQuery = useMemo(
        () => query(collection(db, 'projects').withConverter(projectConverter), where('status', 'in', ['En Curso', 'Completado'])),
        []
    );

    const { data: projects } = useCollection<Project>(projectsQuery);

    // Stable string key of project IDs — only changes when the list actually changes
    const projectIdsKey = useMemo(
        () => (projects ? projects.map(p => p.id).sort().join(',') : '__loading__'),
        [projects]
    );

    // Track last fetched config via ref so mutations don't cause re-renders
    const lastFetchedRef = useRef<{ year: number | null; projectIds: string }>({
        year: null,
        projectIds: '__loading__',
    });

    useEffect(() => {
        // Projects still being fetched from Firestore — wait
        if (projectIdsKey === '__loading__') return;

        // No projects found — nothing to show
        if (projectIdsKey === '') {
            setFinancials([]);
            setIsLoading(false);
            return;
        }

        // Already fetched for this exact year + project list — skip
        if (
            lastFetchedRef.current.year === selectedYear &&
            lastFetchedRef.current.projectIds === projectIdsKey
        ) {
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const results = await Promise.all(
                    // projects is guaranteed non-null/non-empty here
                    projects!.map(async (project) => {
                        const data = await FinancialAnalyticsService.getProjectFinancials(project.id, selectedYear);
                        return { ...data, projectName: project.name };
                    })
                );
                setFinancials(results);
                // Save config to ref — does NOT trigger a re-render
                lastFetchedRef.current = { year: selectedYear, projectIds: projectIdsKey };
            } catch (error) {
                console.error('Failed to fetch financials:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectIdsKey, selectedYear, projects]);

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (financials.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center text-muted-foreground gap-2">
                <p>No se encontraron proyectos con datos financieros para el año {selectedYear}.</p>
                <p className="text-sm">Asegúrese de que existan proyectos "En Curso" o "Completados".</p>
            </div>
        );
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
