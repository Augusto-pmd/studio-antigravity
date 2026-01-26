'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Lightbulb, TrendingUp } from 'lucide-react';
import { analyzeStatement, type AnalyzedStatement } from '@/ai/flows/extract-bank-statement';

export function BankStatementAnalyzer({ currentContext }: { currentContext: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedStatement | null>(null);
  const [isAnalyzing, startTransition] = useTransition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Limit file size to 10MB
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Archivo demasiado grande',
          description: 'Por favor, seleccione un archivo de menos de 10 MB.',
        });
        return;
      }
      setFile(selectedFile);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No hay archivo seleccionado',
        description: 'Por favor, suba un archivo para analizar.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const fileDataUri = reader.result as string;
          try {
            const result = await analyzeStatement({ fileDataUri, currentContext });
            setAnalysisResult(result);
            toast({
              title: 'Análisis Completo',
              description: 'Se ha analizado el documento con éxito.',
            });
          } catch (error) {
            console.error(error);
            toast({
              variant: 'destructive',
              title: 'Error en el Análisis',
              description: 'No se pudo analizar el documento. Inténtelo de nuevo.',
            });
          }
        };
        reader.onerror = () => {
          toast({ variant: 'destructive', title: 'Error de Lectura', description: 'No se pudo leer el archivo.' });
        };
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error Inesperado', description: 'Ocurrió un error al procesar el archivo.' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Asistente de Balance con IA</CardTitle>
        <CardDescription>
          Suba su último balance o estado de cuenta (PDF, JPG, PNG) para recibir un análisis y recomendaciones para el próximo período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="balance-file">Archivo de Balance</Label>
          <div className="flex gap-2">
            <Input
              id="balance-file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 justify-start"
            >
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : 'Seleccionar archivo...'}
            </Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !file}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Analizar
            </Button>
          </div>
        </div>

        {analysisResult && (
          <div className="space-y-6 rounded-lg border bg-background/50 p-4">
            <div className="space-y-2">
              <h3 className="flex items-center text-lg font-semibold">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Resumen del Análisis
              </h3>
              <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center text-lg font-semibold">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Métricas Clave Extraídas
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {analysisResult.keyMetrics.map((item) => (
                  <li key={item.metric}>
                    <span className="font-semibold">{item.metric}:</span> {item.value}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center text-lg font-semibold">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                Recomendaciones
              </h3>
              <p className="text-sm text-muted-foreground">{analysisResult.recommendations}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
