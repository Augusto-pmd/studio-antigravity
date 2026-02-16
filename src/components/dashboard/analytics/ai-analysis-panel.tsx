
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectFinancials } from '@/services/financial-analytics';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Note: In a real app, we should proxy this through an API route to hide the key.
// But for this MVP internally, we might use client-side or better yet, create an API route.
// Let's create a client-side placeholder that suggests calling an API, 
// or simpler: just use a text summary for now if we don't have the API route yet.
// Actually, we DO have the API key in env. 
// Standard practice: Call an internal API route /api/analyze-financials.

export function AIAnalysisPanel({ financials }: { financials: ProjectFinancials[] }) {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runAnalysis = async () => {
        setIsLoading(true);
        try {
            // Prepare summary for AI
            const summary = financials.map(f => ({
                project: f.projectName,
                income: f.income.total,
                cost: f.costs.total,
                roi: f.roi.toFixed(1) + '%'
            }));

            // Call API (we need to create this route, or use a client-side gemini IF key is exposed, which is bad)
            // Let's create the API route: /api/analytics/analyze
            const res = await fetch('/api/analytics/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: summary })
            });
            const data = await res.json();
            setAnalysis(data.text);
        } catch (e) {
            console.error(e);
            setAnalysis("No se pudo generar el análisis en este momento.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {!analysis && (
                <div className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
                    <Sparkles className="h-10 w-10 text-indigo-400" />
                    <p className="text-sm text-muted-foreground">
                        Obtén un diagnóstico instantáneo de la salud financiera de tus obras.
                    </p>
                    <Button onClick={runAnalysis} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Analizar con IA
                    </Button>
                </div>
            )}

            {analysis && (
                <div className="prose prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-indigo-600 font-semibold m-0 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Diagnóstico
                        </h4>
                        <Button variant="ghost" size="sm" onClick={() => setAnalysis(null)}>Cerrar</Button>
                    </div>
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                        {analysis}
                    </div>
                </div>
            )}
        </div>
    );
}
