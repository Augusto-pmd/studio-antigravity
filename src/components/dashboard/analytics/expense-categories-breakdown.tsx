'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { expenseCategories } from '@/lib/data';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import type { ProjectFinancials } from '@/services/financial-analytics';

export function ExpenseCategoriesBreakdown({ financials }: { financials: ProjectFinancials[] }) {

    const analysis = useMemo(() => {
        // Diccionario temporal para acumular gastos por categoría
        const categoryMap: Record<string, { id: string; name: string; total: number }> = {};

        // Inicializar el diccionario consultando el lib/data.ts
        expenseCategories.forEach(cat => {
            categoryMap[cat.id] = { id: cat.id, name: cat.name, total: 0 };
        });

        // Loop principal: sumar todos los gastos reales de todas las obras del año
        let totalOperative = 0; // Gastos Fuga / Hormiga
        let totalDirect = 0; // Costo Puro de Materiales, etc
        let absoluteTotal = 0;

        // Categorías que consideramos "Hormiga" o de Operatividad Fina
        const operativeIds = ['CAT-13', 'CAT-09', 'CAT-07', 'CAT-10', 'CAT-11', 'CAT-04', 'CAT-15', 'CAT-12'];

        financials.forEach(project => {
            if (project.expenses) {
                project.expenses.forEach((exp: { categoryId?: string, amount: number, [key: string]: any }) => {
                    const catId = exp.categoryId || 'CAT-12';
                    if (!categoryMap[catId]) {
                        categoryMap[catId] = { id: catId, name: 'Desconocido', total: 0 };
                    }

                    // Sumamos homogenizando si fuera posible, asumimos total de base ya costeadas por project
                    // (Los financials traen array de expenses, usamos su amount nativo o el equivalente si queremos mas precision, 
                    // para analitica simple usamos amount). Notar que el dashboard principal usa totalCost en ARS/USD homologado.
                    // Para simplificar, acumularemos el amount tal cual y lo mostramos como un peso relativo
                    const val = exp.amount;
                    categoryMap[catId].total += val;
                    absoluteTotal += val;

                    if (operativeIds.includes(catId)) {
                        totalOperative += val;
                    } else {
                        totalDirect += val;
                    }
                });
            }
        });

        // Convertir el diccionario a un Array para Tablas y Gráficos
        const breakdownArray = Object.values(categoryMap)
            .filter(c => c.total > 0)
            .sort((a, b) => b.total - a.total); // Mayor a menor

        return {
            breakdown: breakdownArray,
            totalDirect,
            totalOperative,
            absoluteTotal,
            operativeRatio: absoluteTotal > 0 ? (totalOperative / absoluteTotal) * 100 : 0
        };
    }, [financials]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);

    const macroData = [
        { name: 'Costo Directo (Materiales/MO)', value: analysis.totalDirect, fill: '#3b82f6' },
        { name: 'Gastos Operativos (Fugas)', value: analysis.totalOperative, fill: '#ef4444' }
    ];

    if (analysis.absoluteTotal === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-muted-foreground border border-dashed rounded-md mt-4">
                No hay gastos registrados en el sistema para analizar categorías.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inversión Fuerte (Materiales, Subcontratos)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-blue-500">{formatCurrency(analysis.totalDirect)}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Gastos "Hormiga" y Operativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{formatCurrency(analysis.totalOperative)}</div>
                    </CardContent>
                </Card>
                <Card className="col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Indice de Fuga Administrativa (Sangría)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-end gap-4">
                        <div className={cn("text-4xl font-black", analysis.operativeRatio > 25 ? "text-red-500" : "text-amber-500")}>
                            {analysis.operativeRatio.toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground pb-1">
                            de todo tu dinero gastado se diluye en viáticos, nafta e imprevistos. {analysis.operativeRatio > 25 && "¡Atención! Este valor es muy alto."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Fugas vs Inversión Fuerte</CardTitle>
                        <CardDescription>Comparación del costo estructural vs Fugas (Nafta, Viáticos).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={macroData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                    {macroData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Desglose de Impacto por Rubro</CardTitle>
                        <CardDescription>Listado absoluto de en qué se fue el dinero.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] overflow-auto pr-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Categoría de Gasto</TableHead>
                                        <TableHead className="text-right">Total Acumulado</TableHead>
                                        <TableHead className="text-right w-[80px]">Impacto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysis.breakdown.map((item, index) => {
                                        const pct = (item.total / analysis.absoluteTotal) * 100;
                                        // Highlight specific hormiga expenses
                                        const isHormiga = ['CAT-13', 'CAT-09', 'CAT-07', 'CAT-11'].includes(item.id);

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-medium">
                                                        {item.name}
                                                        {isHormiga && <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">Fuga Constante</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(item.total)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={pct > 10 ? "default" : "secondary"}>
                                                        {pct.toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Nota Analítica para Dirección</AlertTitle>
                <AlertDescription className="text-blue-700/80 dark:text-blue-400">
                    Las "Fugas Operativas" identifican aquellos pequeños gastos logísticos, viáticos y herramientas menores que rara vez son presupuestados inicialmente por la Oficina Técnica, pero que consumen la rentabilidad real de las Obras porque se repiten decenas de veces al mes a través de la Caja Chica. Un "Indice de Sangría" saludable debería rondar entre el 5% y el 12%.
                </AlertDescription>
            </Alert>
        </div>
    );
}
