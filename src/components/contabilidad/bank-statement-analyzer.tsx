'use client';

import { ChangeEvent, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUp, Loader2, TriangleAlert, Wand2 } from 'lucide-react';
import type { BankTransaction } from '@/ai/schemas';
import { extractBankStatementAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number') return '$ 0,00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

export function BankStatementAnalyzer() {
  const [isPending, startTransition] = useTransition();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setTransactions([]);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadstart = () => {
        startTransition(() => {}); // Put UI in pending state
    };

    reader.onloadend = () => {
      startTransition(async () => {
        const dataUri = reader.result as string;
        const result = await extractBankStatementAction(dataUri, file.size);
        if (result.data) {
          setTransactions(result.data.transactions);
          toast({
            title: 'Análisis completado',
            description: `Se han extraído ${result.data.transactions.length} transacciones del extracto.`,
          });
        } else {
          setError(result.error || 'No se pudieron extraer los datos del extracto.');
          toast({
            variant: 'destructive',
            title: 'Error en el análisis',
            description: result.error || 'Ocurrió un error inesperado.',
          });
        }
      });
    };

     reader.onerror = () => {
        startTransition(() => {
            setError('No se pudo leer el archivo seleccionado.');
            toast({ variant: 'destructive', title: 'Error de archivo', description: 'No se pudo leer el archivo.' });
        });
    };
  };

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-primary">Asistente Contable IA</CardTitle>
          </div>
          <CardDescription>
            Sube un extracto bancario en formato PDF y Gemini se encargará de analizarlo, extraer las transacciones y pre-categorizarlas para facilitar tu contabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-xl">
             <Label htmlFor="statement-upload" className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background p-8 text-center hover:border-primary hover:bg-primary/5">
                <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <span className="mt-4 block font-semibold text-foreground">
                    Haz clic para subir un extracto bancario
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                    PDF, hasta 5MB
                </span>
             </Label>
            <Input id="statement-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} disabled={isPending} />
          </div>
        </CardContent>
      </Card>
      
      {(isPending || transactions.length > 0 || error) && (
        <Card>
            <CardHeader>
                <CardTitle>Transacciones Extraídas</CardTitle>
                <CardDescription>
                    Resultados del análisis del extracto bancario.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && !isPending && (
                    <Alert variant="destructive">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Error en el Análisis</AlertTitle>
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Categoría Sugerida</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending && renderSkeleton()}
                            {!isPending && transactions.length === 0 && !error && (
                                 <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay transacciones para mostrar. Sube un extracto para comenzar.
                                    </TableCell>
                                </TableRow>
                            )}
                            {transactions.map((tx, index) => (
                                <TableRow key={index}>
                                    <TableCell className='whitespace-nowrap'>{tx.date}</TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{tx.suggestedCategory}</Badge>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-mono",
                                        tx.type === 'debit' ? 'text-destructive' : 'text-green-500'
                                    )}>
                                        {tx.type === 'debit' ? '-' : '+'} {formatCurrency(tx.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
