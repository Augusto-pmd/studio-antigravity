'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateDashboardSummaryAction } from '@/lib/actions';
import { Wand2 } from 'lucide-react';

export function AiSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const result = await generateDashboardSummaryAction();
        setSummary(result.summary);
      } catch (error) {
        setSummary('No se pudo generar el resumen en este momento.');
      }
      setIsLoading(false);
    };

    fetchSummary();
  }, []);

  // Function to parse simple markdown (bold)
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-primary">Resumen Inteligente</CardTitle>
        </div>
        <CardDescription>Un análisis de la situación actual generado por IA.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed">
             {summary ? renderMarkdown(summary) : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
