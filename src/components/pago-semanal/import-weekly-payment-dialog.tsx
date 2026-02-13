
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PayrollWeek } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportWeeklyPaymentDialogProps {
    currentWeek?: PayrollWeek | null; // Optional now
    onSuccess: () => void;
}

export function ImportWeeklyPaymentDialog({ currentWeek, onSuccess }: ImportWeeklyPaymentDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleImport = async () => {
        if (!file) return;
        setIsUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // If currentWeek is provided (legacy mode or specific week override), we might still want to pass it
            // But the new API ignores it mostly, favoring sheet names. 
            // Let's pass it just in case we want to support single-sheet override later, 
            // but for now the API is sheet-driven.
            if (currentWeek) {
                formData.append('weekStart', currentWeek.startDate);
                formData.append('weekEnd', currentWeek.endDate);
                if (currentWeek.exchangeRate) {
                    formData.append('exchangeRateWeekly', currentWeek.exchangeRate.toString());
                }
            }

            const res = await fetch('/api/weekly-payments/import', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error importing file');

            setResult(data);
            // Verify if any sheet was processed
            if (data.sheetsProcessed > 0 || (data.created && (data.created.attendance > 0 || data.created.certifications > 0))) {
                toast({ title: 'Importación Completada', description: `Se procesaron ${data.sheetsProcessed} hojas.` });
                onSuccess();
            } else {
                toast({ variant: 'destructive', title: 'Sin datos', description: 'No se importaron registros. Revise el formato.' });
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importar Pago Semanal</DialogTitle>
                    <DialogDescription>
                        Cargue el archivo Excel. El sistema detectará las semanas automáticamente basándose en los nombres de las hojas.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="excel">Archivo Excel (.xlsx)</Label>
                        <Input id="excel" type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </div>
                </div>

                {result && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="border rounded p-2 bg-green-50">
                                <div className="font-bold text-green-700">{result.created.attendance}</div>
                                <div className="text-xs">Asistencias</div>
                            </div>
                            <div className="border rounded p-2 bg-blue-50">
                                <div className="font-bold text-blue-700">{result.created.certifications}</div>
                                <div className="text-xs">Certif.</div>
                            </div>
                            <div className="border rounded p-2 bg-orange-50">
                                <div className="font-bold text-orange-700">{result.created.fundRequests}</div>
                                <div className="text-xs">Solicitudes</div>
                            </div>
                        </div>

                        {result.warnings && result.warnings.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Advertencias ({result.warnings.length})</AlertTitle>
                                <AlertDescription>
                                    <ScrollArea className="h-32 w-full mt-2">
                                        <ul className="text-xs list-disc list-inside">
                                            {result.warnings.map((w: any, i: number) => (
                                                <li key={i}>{w.sheet ? `[${w.sheet}] ` : ''}Fila {w.row}: {w.reason}</li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </AlertDescription>
                            </Alert>
                        )}

                        {result.warnings && result.warnings.length === 0 && (
                            <Alert className="border-green-500 text-green-700 bg-green-50">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Todo correcto</AlertTitle>
                                <AlertDescription>
                                    Se procesaron {result.sheetsProcessed} hojas correctamente.
                                </AlertDescription>
                            </Alert>
                        )}

                    </div>
                )}

                <DialogFooter>
                    <Button onClick={handleImport} disabled={!file || isUploading}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importar v2 (Multi-Hoja)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
