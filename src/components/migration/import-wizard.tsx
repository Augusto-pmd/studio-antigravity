
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ArrowRight, Construction, Search, ShoppingCart, Hammer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IMPORT_SCHEMAS, ImportModuleType } from '@/lib/import-schemas';
import { Badge } from '@/components/ui/badge';

interface AnalysisResult {
    headerRowIndex: number;
    dataStartRowIndex: number;
    mappings: any;
}

interface ValidationResponse {
    success: boolean;
    analysis: AnalysisResult;
    missingEntities?: {
        projects?: string[];
        people?: string[];
    };
    error?: string;
}

export function ImportWizard() {
    const { toast } = useToast();
    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [moduleId, setModuleId] = useState<ImportModuleType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [validation, setValidation] = useState<ValidationResponse | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    // Entity Resolution State
    const [resolvedEntities, setResolvedEntities] = useState<Record<string, string>>({}); // { "Old Name": "New ID" }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStep(2); // Auto-advance to analysis
            runAnalysis(e.target.files[0]);
        }
    };

    const runAnalysis = async (selectedFile: File) => {
        if (!selectedFile || !moduleId) return;
        setIsLoading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('moduleId', moduleId);

        try {
            const response = await fetch('/api/migration/validate', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error analizando archivo");

            setValidation(data);
            setStep(3);
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
            setStep(1); // Go back to upload
        } finally {
            setIsLoading(false);
        }
    };

    const createEntity = async (type: string, name: string) => {
        try {
            const res = await fetch('/api/migration/create-entity', {
                method: 'POST',
                body: JSON.stringify({ type, name }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setResolvedEntities(prev => ({ ...prev, [name]: data.id }));
                toast({ title: "Creado", description: `${name} ha sido creado correctamente.` });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo crear la entidad." });
        }
    };

    const pendingEntitiesCount = () => {
        if (!validation?.missingEntities) return 0;
        let count = 0;
        if (validation.missingEntities.projects) {
            count += validation.missingEntities.projects.filter(p => !resolvedEntities[p]).length;
        }
        // Add other types if needed
        return count;
    };

    const runImport = async () => {
        if (!file || !moduleId) return;
        setIsLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('moduleId', moduleId);

        try {
            // ROUTING LOGIC
            // Weekly Payment uses the specialized legacy importer for now (complex attendance logic).
            // Stock and Expenses use the new Generic Engine.
            let endpoint = moduleId === 'WEEKLY_PAYMENT'
                ? '/api/weekly-payments/import'
                : '/api/migration/import';

            // Prepare Analysis Override
            if (validation?.analysis) {
                if (moduleId === 'WEEKLY_PAYMENT') {
                    // Legacy Adapter: Convert generic mappings to legacy format
                    const legacyAnalysis = {
                        headerRowIndex: validation.analysis.headerRowIndex,
                        dataStartRowIndex: validation.analysis.dataStartRowIndex,
                        nameColumnIndex: validation.analysis.mappings.name,
                        projectColumnIndices: validation.analysis.mappings.projects || [],
                        dayColumnIndices: validation.analysis.mappings.days || []
                    };
                    formData.append('analysisOverride', JSON.stringify(legacyAnalysis));
                } else {
                    // Generic Engine: Pass analysis directly
                    formData.append('analysis', JSON.stringify(validation.analysis));
                }
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setImportResult(data);
            setStep(4);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al importar", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStep(0);
        setFile(null);
        setModuleId(null);
        setValidation(null);
        setImportResult(null);
        setResolvedEntities({});
    };

    return (
        <Card className="w-full shadow-md border-l-4 border-l-indigo-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                    Importador Inteligente
                </CardTitle>
                <CardDescription>
                    Asistente para migración de datos desde Excel.
                </CardDescription>
            </CardHeader>
            <CardContent>

                {/* STEP 0: MODULE SELECTION */}
                {step === 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 border-b pb-2 mb-4">Paso 1: Selecciona el Tipo de Datos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.values(IMPORT_SCHEMAS).map((schema) => (
                                <div
                                    key={schema.id}
                                    onClick={() => { setModuleId(schema.id); setStep(1); }}
                                    className="border rounded-lg p-6 hover:bg-slate-50 cursor-pointer transition-all hover:border-indigo-300 flex flex-col items-center text-center gap-3"
                                >
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        {schema.id === 'STOCK' ? <Hammer className="h-6 w-6" /> :
                                            schema.id === 'EXPENSES' ? <ShoppingCart className="h-6 w-6" /> :
                                                <Construction className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{schema.label}</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-snug">{schema.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                )}

                        {/* STEP 1: UPLOAD */}
                        {step === 1 && moduleId && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                    <Badge variant="outline">{IMPORT_SCHEMAS[moduleId].label}</Badge>
                                    <span>&rarr; Subir Archivo</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('wizard-upload')?.click()}>
                                    <Upload className="h-10 w-10 text-slate-400 mb-4" />
                                    <p className="text-sm text-slate-600 font-medium mb-2">
                                        Clic para seleccionar archivo
                                    </p>
                                    <input
                                        id="wizard-upload"
                                        type="file"
                                        accept=".xlsx"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Volver</Button>
                            </div>
                        )}

                        {/* STEP 2: LOADING */}
                        {step === 2 && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                                <h3 className="text-lg font-medium text-slate-700">Analizando Datos...</h3>
                                <p className="text-slate-500 text-sm max-w-xs text-center mt-2">
                                    Validando estructura y buscando entidades faltantes.
                                </p>
                            </div>
                        )}

                        {/* STEP 3: PREVIEW & RESOLVE */}
                        {step === 3 && validation && (
                            <div className="space-y-6">
                                {/* Validation Summary */}
                                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-md border">
                                    <div className={`p-2 rounded-full ${pendingEntitiesCount() > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                                        {pendingEntitiesCount() > 0 ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">Resultado del Análisis</h4>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Se detectaron {validation.missingEntities?.projects?.length || 0} obras desconocidas.
                                        </p>
                                    </div>
                                </div>

                                {/* Missing Entities Resolution */}
                                {validation.missingEntities?.projects && validation.missingEntities.projects.length > 0 && (
                                    <div className="border rounded-md overflow-hidden">
                                        <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex justify-between items-center">
                                            <h5 className="text-sm font-semibold text-amber-800">Obras No Registradas</h5>
                                            <Badge variant="outline" className="bg-white text-amber-800 border-amber-200">
                                                Requiere Acción
                                            </Badge>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nombre en Excel</TableHead>
                                                    <TableHead>Acción</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {validation.missingEntities.projects.map(name => {
                                                    const isResolved = !!resolvedEntities[name];
                                                    return (
                                                        <TableRow key={name} className={isResolved ? "bg-slate-50 opacity-60" : ""}>
                                                            <TableCell className="font-medium">{name}</TableCell>
                                                            <TableCell>
                                                                {isResolved ? (
                                                                    <span className="flex items-center gap-1 text-green-600 text-sm">
                                                                        <CheckCircle className="h-3 w-3" /> Creado
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs"
                                                                            onClick={() => createEntity('project', name)}
                                                                        >
                                                                            Crear "{name}"
                                                                        </Button>
                                                                        {/* Map Feature to be added */}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={reset}>Cancelar</Button>
                                    <Button
                                        onClick={runImport}
                                        disabled={isLoading || pendingEntitiesCount() > 0}
                                        className={pendingEntitiesCount() > 0 ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e Importar"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === 4 && importResult && (
                            <div className="text-center py-8">
                                <div className="flex justify-center mb-4">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle className="h-8 w-8 text-green-600" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">¡Importación Exitosa!</h3>
                                <p className="text-slate-500 mt-2">Los datos se han cargado correctamente.</p>
                                <Button className="mt-8" onClick={reset}>Volver al Inicio</Button>
                            </div>
                        )}

                    </CardContent>
        </Card>
    );
}
