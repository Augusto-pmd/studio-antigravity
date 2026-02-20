'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { normalizeDate } from '@/lib/import-utils';
import {
    CheckCircle, ArrowRight, Save, ClipboardPaste, Briefcase,
    DollarSign, FileSpreadsheet, RotateCcw, Plus, Trash2, ArrowLeft,
    Settings2, LayoutList, MessageSquarePlus, PlayCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, setDoc } from 'firebase/firestore';

// Configuration for supported entities
type EntityConfig = {
    label: string;
    icon: any;
    description: string;
    fields: FieldDefinition[];
    dbCollection: string;
};

type FieldDefinition = {
    key: string;
    label: string;
    description?: string; // For the chat prompt
    required: boolean;
    defaultValue?: any;
    isVirtual?: boolean; // If true, handled specially during transform
};

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
    expenses: {
        label: 'Gastos e Ingresos',
        icon: DollarSign,
        dbCollection: 'expenses_split',
        description: 'Importar movimientos de dinero hacia las obras.',
        fields: [
            { key: 'date', label: 'Fecha', description: '¿En qué columna están las fechas?', required: true },
            { key: 'project', label: 'Obra', description: 'Obra asignada al gasto', required: true },
            { key: 'description', label: 'Descripción / Concepto', description: '¿Dónde está el detalle o concepto?', required: true },
            { key: 'amount', label: 'Monto (Único)', description: '¿Columna de monto (si es una sola)?', required: false },
            { key: 'income', label: 'Columna Ingresos (+)', description: '¿Tienes una columna separada para ENTRADAS?', required: false, isVirtual: true },
            { key: 'expense', label: 'Columna Egresos (-)', description: '¿Y la de SALIDAS?', required: false, isVirtual: true },
            { key: 'category', label: 'Categoría', description: '¿Qué columna indica el rubro?', required: false },
            { key: 'supplierName', label: 'Proveedor', description: '¿Nombre del proveedor/persona?', required: false },
            { key: 'invoice', label: 'Factura', description: '¿Datos de facturación?', required: false },
            { key: 'exchangeRate', label: 'Tipo de Cambio (ARS/USD)', description: '¿Cotización del dólar?', required: false, defaultValue: '1' },
            { key: 'paymentSource', label: 'Caja/Teso', description: 'Origen (Tesorería o Caja Chica)', required: false, defaultValue: 'Caja Chica' },
            { key: 'status', label: 'Estado', description: '¿Estado del pago?', required: false, defaultValue: 'Paid' },
        ]
    },
    // New entity prompt from user
    attendances: {
        label: 'Asistencias',
        icon: FileSpreadsheet,
        dbCollection: 'attendances',
        description: 'Control de presentismo de personal.',
        fields: [
            { key: 'date', label: 'Fecha', description: '¿Fecha de la asistencia?', required: true },
            { key: 'personName', label: 'Nombre Persona', description: '¿Nombre del empleado?', required: true },
            { key: 'checkIn', label: 'Horario Entrada', description: '¿Hora de llegada?', required: false },
            { key: 'checkOut', label: 'Horario Salida', description: '¿Hora de salida?', required: false },
            { key: 'status', label: 'Estado (Pte/Aus)', description: '¿Estuvo presente?', required: true },
        ]
    },
    projects: {
        label: 'Obras',
        icon: Briefcase,
        dbCollection: 'projects',
        description: 'Crear nuevas obras en el sistema.',
        fields: [
            { key: 'name', label: 'Nombre Obra', description: 'Nombre del proyecto', required: true },
            { key: 'client', label: 'Cliente', description: 'Cliente asignado', required: true },
            { key: 'address', label: 'Dirección', description: 'Ubicación de la obra', required: true },
            { key: 'projectType', label: 'Tipo de Obra', description: 'Residencial, Comercial, etc.', required: true },
            { key: 'currency', label: 'Moneda (ARS/USD)', description: 'Moneda del presupuesto', required: false, defaultValue: 'ARS' },
            { key: 'budget', label: 'Presupuesto', description: 'Monto total asignado', required: true },
            { key: 'supervisor', label: 'Supervisor', description: 'Responsable de obra', required: true },
            { key: 'startDate', label: 'Fecha Inicio', description: 'Fecha de arranque', required: false },
            { key: 'endDate', label: 'Fecha Fin', description: 'Fecha estimada fin', required: false },
            { key: 'status', label: 'Estado', description: 'Estado actual', required: false, defaultValue: 'En Curso' }
        ]
    },
    employees: {
        label: 'Personal',
        icon: LayoutList,
        dbCollection: 'employees',
        description: 'Cargar lista de empleados.',
        fields: [
            { key: 'name', label: 'Nombre Completo', description: 'Nombre y Apellido', required: true },
            { key: 'category', label: 'Categoría', description: 'Oficial, Ayudante, etc.', required: false, defaultValue: 'Ayudante' },
            { key: 'paymentType', label: 'Tipo Pago (Diario/Semanal)', description: '¿Cómo cobra?', required: false, defaultValue: 'Semanal' },
            { key: 'dailyWage', label: 'Jornal / Sueldo', description: 'Valor del día o mes', required: false },
            { key: 'phone', label: 'Teléfono', description: 'Contacto', required: false },
            { key: 'email', label: 'Email', description: 'Correo electrónico', required: false },
            { key: 'emergencyContactName', label: 'Contacto Emergencia', description: 'Nombre contacto emergencia', required: false },
            { key: 'emergencyContactPhone', label: 'Tel. Emergencia', description: 'Teléfono emergencia', required: false },
            { key: 'artExpiryDate', label: 'Vencimiento ART', description: 'Fecha vencimiento', required: false },
            { key: 'status', label: 'Estado', description: 'Activo / Inactivo', required: false, defaultValue: 'Activo' }
        ]
    },
    contractors: {
        label: 'Contratistas',
        icon: Settings2,
        dbCollection: 'contractors',
        description: 'Proveedores de mano de obra.',
        fields: [
            { key: 'name', label: 'Razón Social / Nombre', description: 'Nombre del contratista', required: true },
            { key: 'cuit', label: 'CUIT', description: 'Identificación fiscal', required: true },
            { key: 'address', label: 'Dirección', description: 'Domicilio fiscal', required: false },
            { key: 'fiscalCondition', label: 'Cond. Fiscal', description: 'Resp. Inscripto, Monotributo', required: false },
            { key: 'contactPerson', label: 'Contacto', description: 'Persona de contacto', required: false },
            { key: 'phone', label: 'Teléfono', description: 'Contacto', required: false },
            { key: 'email', label: 'Email', description: 'Correo electrónico', required: false },
            { key: 'artExpiryDate', label: 'Vencimiento ART', description: 'Fecha vencimiento', required: false },
            { key: 'insuranceExpiryDate', label: 'Vencimiento Seguro', description: 'Fecha vencimiento', required: false },
            { key: 'status', label: 'Estado', description: 'Aprobado / Pendiente', required: false, defaultValue: 'Aprobado' }
        ]
    },
    suppliers: {
        label: 'Proveedores',
        icon: Briefcase,
        dbCollection: 'suppliers',
        description: 'Proveedores de materiales y servicios.',
        fields: [
            { key: 'name', label: 'Nombre Proveedor', description: 'Nombre de la empresa', required: true },
            { key: 'cuit', label: 'CUIT', description: 'Identificación fiscal', required: true },
            { key: 'alias', label: 'Alias', description: 'Nombre de fantasía', required: false },
            { key: 'address', label: 'Dirección', description: 'Domicilio', required: false },
            { key: 'fiscalCondition', label: 'Cond. Fiscal', description: 'Resp. Inscripto, Monotributo', required: false },
            { key: 'contactPerson', label: 'Contacto', description: 'Persona de contacto', required: false },
            { key: 'phone', label: 'Teléfono', description: 'Contacto', required: false },
            { key: 'email', label: 'Email', description: 'Correo electrónico', required: false },
            { key: 'type', label: 'Rubro/Tipo', description: 'Materiales, Servicios, Mixto', required: false, defaultValue: 'Materiales' },
            { key: 'status', label: 'Estado', description: 'Aprobado / Pendiente', required: false, defaultValue: 'Aprobado' }
        ]
    },
    weeklyPayments: {
        label: 'Pago Semanal (Completo)',
        icon: DollarSign,
        dbCollection: 'weeklyPayments_split', // Virtual collection
        description: 'Importar TODO: Personal, Contratistas y Pedidos.',
        fields: [
            { key: 'date', label: 'Fecha', description: 'Fecha del movimiento', required: true },
            { key: 'beneficiary', label: 'Beneficiario', description: 'Nombre del Empleado, Contratista o Solicitante', required: true },
            { key: 'concept', label: 'Concepto / Notas', description: 'Descripción (Ej: Jornal, Certificación, Materiales)', required: true },
            { key: 'project', label: 'Obra', description: 'Obra asignada', required: false },
            { key: 'amount', label: 'Monto (Opcional)', description: 'Monto ($). Si es asistencia, dejar vacío o 0.', required: false },
            { key: 'hours', label: 'Horas / Días (Solo Personal)', description: 'Si es asistencia: cant. de horas o 1 para presente', required: false },
            { key: 'type', label: 'Tipo (Auto)', description: 'Asistencia / Certificación / Pedido', required: false, defaultValue: 'Pedido' }
        ]
    }
};

export function DataImporter() {
    // Steps: 0=Entity, 1=ConversationalBuilder, 2=PasteData, 3=Preview
    const [step, setStep] = useState(0);
    const [entityType, setEntityType] = useState<keyof typeof ENTITY_CONFIGS>('expenses');

    // Schema Builder State
    const [selectedFields, setSelectedFields] = useState<string[]>([]);

    // Data State
    const [pastedText, setPastedText] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const { toast } = useToast();
    const firestore = useFirestore();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [selectedFields, step]);

    // Load schema from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`migration_schema_v2_${entityType}`);
        if (saved) {
            try {
                // We don't auto-set simple array anymore, we might want to respect the user's wish to "build it together"
                // But for convenience, if they have a saved schema, we could offer to load it OR start fresh.
                // For now, let's load it but maybe in future ask.
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSelectedFields(parsed);
                }
            } catch (e) { }
        }
    }, [entityType]);

    // Save schema
    useEffect(() => {
        if (selectedFields.length > 0) {
            localStorage.setItem(`migration_schema_v2_${entityType}`, JSON.stringify(selectedFields));
        }
    }, [selectedFields, entityType]);

    // --- Step 0: Entity Selection ---
    const handleTypeSelect = (type: string) => {
        setEntityType(type);
        setStep(1); // Go to builder
        // We reset selectedFields if they want to build from scratch? 
        // Or keep history? Let's keep history for now, but maybe add a "Reset" button.
        // Actually, user said "y si armamos la planilla juntos?". 
        // If we load from cache, we skip the "juntos" part. 
        // Let's clear cache logic for now to force the wizard experience as requested, 
        // OR add a "Start Fresh" option.
        setSelectedFields([]); // Force fresh start for the "conversation" experience
    };

    // --- Actions ---
    const addField = (key: string) => {
        setSelectedFields(prev => [...prev, key]);
    };

    const removeLastField = () => {
        setSelectedFields(prev => prev.slice(0, -1));
    };

    // --- Step 2: Processing Paste ---
    const processPastedText = () => {
        try {
            const firstLine = pastedText.split('\n')[0];
            const isSemicolon = firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/\t/g)?.length || 0);
            const separator = isSemicolon ? ';' : '\t';

            const rows = pastedText.split('\n');
            const cleanRows = rows.map(r => r.split(separator).map(c => c.trim())).filter(r => r.some(c => c !== ''));

            if (cleanRows.length === 0) throw new Error("No hay datos.");

            let dataRows = cleanRows;

            // Heuristic Header Skip
            const firstCell = dataRows[0][0]?.toLowerCase();
            const headerKeywords = ['fecha', 'date', 'concepto', 'descripcion', 'description', 'monto', 'amount', 'dolar', 'factura', 'invoice'];
            if (firstCell && headerKeywords.some(k => firstCell.includes(k))) {
                dataRows = dataRows.slice(1);
            }

            const parsed = dataRows.map((row, rowIdx) => {
                const item: any = { _row: rowIdx + 1, _errors: [] };

                // Map based on Selected Fields Order
                selectedFields.forEach((fieldKey, colIdx) => {
                    const val = row[colIdx] ? row[colIdx] : '';
                    const fieldConfig = Config.fields.find(f => f.key === fieldKey);

                    // Validation: Required Check
                    if (fieldConfig?.required && (!val || val.trim() === '')) {
                        item._errors.push(`Falta: ${fieldConfig.label}`);
                    }

                    const isAmountLike = ['amount', 'budget', 'price', 'cost', 'wage', 'income', 'expense'].some(k => fieldKey.toLowerCase().includes(k));
                    const isDateLike = ['date', 'startdate', 'enddate'].some(k => fieldKey.toLowerCase().includes(k));

                    if (isAmountLike) {
                        let cleanVal = val.replace(/[^0-9,.-]/g, '');
                        if (cleanVal.includes(',') && cleanVal.includes('.')) {
                            if (cleanVal.lastIndexOf(',') > cleanVal.lastIndexOf('.')) {
                                cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
                            } else {
                                cleanVal = cleanVal.replace(/,/g, '');
                            }
                        } else if (cleanVal.includes(',')) {
                            cleanVal = cleanVal.replace(',', '.');
                        }
                        item[fieldKey] = parseFloat(cleanVal) || 0;
                    } else if (isDateLike) {
                        item[fieldKey] = normalizeDate(val) || val;
                    } else {
                        item[fieldKey] = val;
                    }
                });
                return item;
            });

            // Post-Processing
            const finalParsed = parsed.map(item => {
                // ... (existing post-processing logic) ...
                if (entityType === 'expenses') {
                    const inc = item['income'] || 0;
                    const exp = item['expense'] || 0;

                    if (inc > 0) {
                        item.amount = Math.abs(inc);
                        item.type = 'income';
                    } else if (exp > 0) {
                        item.amount = -Math.abs(exp);
                        item.type = 'expense';
                    } else {
                        if (item.amount < 0) item.type = 'expense';
                        else item.type = 'income';
                    }
                    delete item['income'];
                    delete item['expense'];
                }
                return item;
            });

            setRawData(finalParsed);
            setStep(3);
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error al procesar', description: e.message });
        }
    };

    // --- Template Generation ---
    const downloadTemplate = () => {
        const config = ENTITY_CONFIGS[entityType];
        if (!config) return;

        // 1. Get Headers
        const headers = config.fields.map(f => f.key);

        // 2. Create Sample Data (Empty or with examples)
        const sampleRow: any = {};
        config.fields.forEach(f => {
            if (f.defaultValue) sampleRow[f.key] = f.defaultValue;
            else if (f.key === 'date') sampleRow[f.key] = '2024-01-01';
            else if (f.key.includes('amount') || f.key.includes('price')) sampleRow[f.key] = 1000;
            else if (f.key === 'email') sampleRow[f.key] = 'ejemplo@email.com';
            else sampleRow[f.key] = `Ejemplo ${f.label}`;
        });

        const data = [sampleRow];

        // 3. Create Worksheet
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });

        // 4. Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, config.label.substring(0, 30)); // Sheet name max 31 chars

        // 5. Save
        XLSX.writeFile(wb, `Plantilla_${config.label.replace(/\s+/g, '_')}.xlsx`);
    };

    // --- Step 3: Execution ---
    const executeImport = async () => {
        if (!firestore) return;
        setIsImporting(true);
        setImportProgress({ current: 0, total: rawData.length });

        try {
            if (entityType === 'weeklyPayments') {
                // SPECIAL LOGIC: Split into collections + Week Association
                const certifications = [];
                const fundRequests = [];
                const attendances = [];
                const cashAdvances = [];

                // 1. Fetch existing weeks & employees
                const weeksSnapshot = await getDocs(collection(firestore, 'payrollWeeks'));
                const weeks = weeksSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

                const employeesSnapshot = await getDocs(collection(firestore, 'employees'));
                const employees = employeesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

                const newWeeksCache: Record<string, string> = {}; // Format: "YYYY-MM-DD" (start date) -> ID

                for (const row of rawData) {
                    const concept = row.concept?.toLowerCase() || '';
                    const type = row.type?.toLowerCase() || '';
                    const beneficiary = row.beneficiary || '';

                    // Detect Type
                    const isCertification = type.includes('cert') || concept.includes('cert') || concept.includes('avance') || concept.includes('mano de obra');
                    const isAttendance = type.includes('asist') || concept.includes('asist') || concept.includes('jornal') || concept.includes('presente');
                    const isAdvance = type.includes('adelanto') || concept.includes('adelanto') || concept.includes('vale');

                    // Find Week ID (Common for all)
                    let weekId = null;
                    if (row.date) {
                        const dateObj = new Date(row.date);
                        // Adjust to Monday
                        const day = dateObj.getDay();
                        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                        const weekStart = new Date(dateObj);
                        weekStart.setDate(diff);
                        const weekStartStr = weekStart.toISOString().split('T')[0];

                        weekId = weeks.find(w => w.startDate === weekStartStr)?.id || newWeeksCache[weekStartStr];

                        if (!weekId) {
                            // Create Week
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekEnd.getDate() + 6);
                            const newWeekRef = doc(collection(firestore, 'payrollWeeks'));
                            await setDoc(newWeekRef, {
                                startDate: weekStartStr,
                                endDate: weekEnd.toISOString().split('T')[0],
                                exchangeRate: 0
                            });
                            weekId = newWeekRef.id;
                            newWeeksCache[weekStartStr] = weekId;
                        }
                    }

                    if (isCertification) {
                        certifications.push({
                            date: row.date,
                            contractorName: beneficiary,
                            projectName: row.project || 'Sin Obra',
                            amount: row.amount,
                            notes: row.concept,
                            status: 'Aprobado',
                            payrollWeekId: weekId
                        });
                    } else if (isAttendance) {
                        // Find Employee ID
                        const employee = employees.find(e => e.name.toLowerCase() === beneficiary.toLowerCase());
                        if (employee) {
                            attendances.push({
                                date: row.date,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                status: 'presente',
                                checkIn: '08:00',
                                checkOut: '17:00',
                                lateHours: 0,
                                payrollWeekId: weekId
                            });
                        }
                    } else if (isAdvance) {
                        const employee = employees.find(e => e.name.toLowerCase() === beneficiary.toLowerCase());
                        if (employee) {
                            cashAdvances.push({
                                date: row.date,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                amount: row.amount,
                                reason: row.concept,
                                payrollWeekId: weekId
                            });
                        }
                    } else {
                        // Fund Request (Default)
                        fundRequests.push({
                            date: row.date,
                            requesterName: beneficiary,
                            category: row.type || 'Materiales',
                            amount: row.amount,
                            projectName: row.project || 'General',
                            description: row.concept,
                            status: 'Pendiente'
                        });
                    }
                }

                // Execute Batches
                const MAX_BATCH_SIZE = 450;

                // Helper to save batches
                const saveBatch = async (collectionName: string, items: any[]) => {
                    for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
                        const batch = writeBatch(firestore);
                        const chunk = items.slice(i, i + MAX_BATCH_SIZE);
                        chunk.forEach(item => {
                            const newRef = doc(collection(firestore, collectionName));
                            batch.set(newRef, { ...item, _createdAt: new Date().toISOString() });
                        });
                        await batch.commit();
                    }
                };

                await saveBatch('contractorCertifications', certifications);
                await saveBatch('attendances', attendances);
                await saveBatch('cashAdvances', cashAdvances);
                await saveBatch('fundRequests', fundRequests);

                toast({ title: 'Importación Completa', description: `Se procesaron: ${certifications.length} Certs, ${attendances.length} Asistencias, ${cashAdvances.length} Adelantos, ${fundRequests.length} Pedidos.` });

            } else if (entityType === 'expenses') {
                const projectsSnapshot = await getDocs(collection(firestore, 'projects'));
                const projects = projectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

                let processedCount = 0;
                const MAX_BATCH_SIZE = 450;
                const total = rawData.length;

                for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
                    const batch = writeBatch(firestore);
                    const chunk = rawData.slice(i, i + MAX_BATCH_SIZE);

                    chunk.forEach(item => {
                        const projectNameStr = item.project?.toString().toLowerCase().trim() || '';
                        let matchedProject = projects.find(p => p.name.toLowerCase().trim() === projectNameStr);

                        if (!matchedProject && projectNameStr) {
                            matchedProject = projects.find(p => p.name.toLowerCase().trim().includes(projectNameStr) || projectNameStr.includes(p.name.toLowerCase().trim()));
                        }

                        const projectId = matchedProject ? matchedProject.id : 'unknown_project';

                        const docRef = doc(collection(firestore, 'projects', projectId, 'expenses'));
                        const finalItem = {
                            ...item,
                            projectId,
                            createdAt: new Date().toISOString(),
                            _importedAt: new Date().toISOString(),
                            _importSource: 'wizard_v3'
                        };
                        delete finalItem._row;
                        delete finalItem._errors;
                        delete finalItem.project;
                        batch.set(docRef, finalItem);
                    });

                    await batch.commit();
                    processedCount += chunk.length;
                    setImportProgress({ current: processedCount, total });
                    await new Promise(r => setTimeout(r, 50));
                }
                toast({ title: 'Importación Completada', description: `Se guardaron ${processedCount} gastos en sus respectivas obras.` });
            } else {
                // STANDARD LOGIC
                const targetCollection = ENTITY_CONFIGS[entityType].dbCollection || 'temp_imports';
                const total = rawData.length;
                const CHUNK_SIZE = 450;
                let processedCount = 0;

                for (let i = 0; i < total; i += CHUNK_SIZE) {
                    const batch = writeBatch(firestore);
                    const chunk = rawData.slice(i, i + CHUNK_SIZE);

                    chunk.forEach(item => {
                        const docRef = doc(collection(firestore, targetCollection));
                        const finalItem = {
                            ...item,
                            createdAt: new Date().toISOString(),
                            _importedAt: new Date().toISOString(),
                            _importSource: 'wizard_v3'
                        };
                        delete finalItem._row;
                        delete finalItem._errors;
                        batch.set(docRef, finalItem);
                    });

                    await batch.commit();
                    processedCount += chunk.length;
                    setImportProgress({ current: processedCount, total });
                    await new Promise(r => setTimeout(r, 50));
                }
                toast({ title: 'Importación Completada', description: `Se guardaron ${processedCount} registros.` });
            }

            setStep(0); // Reset to initial step
            setPastedText('');
            setRawData([]);
            setSelectedFields([]);

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Falló la importación: ' + error.message });
        } finally {
            setIsImporting(false);
        }
    };

    const Config = ENTITY_CONFIGS[entityType];

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Asistente de Importación</h1>
                    <p className="text-muted-foreground mt-1">Sigue los pasos para cargar tus datos masivamente.</p>
                </div>
                {step > 0 && (
                    <Button variant="ghost" onClick={() => setStep(0)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Empezar de Nuevo
                    </Button>
                )}
            </div>

            {/* STEP 0: Selection */}
            {step === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(ENTITY_CONFIGS).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <Card
                                key={key}
                                className="group cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                                onClick={() => handleTypeSelect(key)}
                            >
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{config.label}</CardTitle>
                                        <CardDescription className="mt-1">{config.description}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* STEP 1: Conversational Builder */}
            {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chat / Question Area */}
                    <Card className="lg:col-span-2 border-primary/20 shadow-md">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-start">
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquarePlus className="h-5 w-5 text-primary" />
                                    Armemos tu planilla
                                </CardTitle>
                                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Descargar Modelo Excel
                                </Button>
                            </div>
                            <CardDescription>
                                Puedes descargar el modelo ideal, llenarlo y subirlo re-iniciando el proceso.
                                O sigue conversando para mapear tu archivo actual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* History */}
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2" ref={chatContainerRef}>
                                {selectedFields.map((fieldKey, idx) => {
                                    const f = Config.fields.find(fi => fi.key === fieldKey);
                                    return (
                                        <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-4">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-none text-sm">
                                                <span className="font-semibold block text-primary mb-0.5">Columna {idx + 1}</span>
                                                {f?.label}
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Current Question */}
                                <div className="flex gap-3 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                                        {selectedFields.length + 1}
                                    </div>
                                    <div className="bg-primary/5 px-4 py-3 rounded-2xl rounded-tl-none border border-primary/20">
                                        <p className="font-medium text-lg">
                                            ¿Qué datos hay en la <span className="text-primary font-bold">Columna {selectedFields.length + 1}</span>?
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="border-t pt-4">
                                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Selecciona una opción:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Config.fields.filter(f => !selectedFields.includes(f.key) || f.key === 'ignore').map(f => (
                                        <Button
                                            key={f.key}
                                            variant="outline"
                                            className="rounded-full hover:border-primary hover:bg-primary/5 transition-all"
                                            onClick={() => addField(f.key)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> {f.label}
                                        </Button>
                                    ))}
                                    <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => addField('ignore')}>
                                        Ignorar esta columna
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/30 flex justify-between items-center py-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeLastField}
                                disabled={selectedFields.length === 0}
                                className="text-muted-foreground"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" /> Deshacer último
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    size="lg"
                                    onClick={() => setStep(2)}
                                    disabled={selectedFields.length === 0}
                                    className="px-8 shadow-lg shadow-primary/20"
                                >
                                    ¡Listo, pegar datos! <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Preview / Context */}
                    <div className="space-y-4">
                        <Card className="bg-muted/50 border-dashed">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm uppercase text-muted-foreground">Tu Estructura Actual</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedFields.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground italic text-sm">
                                        Aún no has definido columnas.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {selectedFields.map((k, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm bg-background p-2 rounded border">
                                                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center font-mono text-[10px]">{i + 1}</Badge>
                                                <span className="truncate flex-1">{Config.fields.find(f => f.key === k)?.label || 'Ignorar'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* STEP 2: Paste Input */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in">
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="font-semibold">¡Estructura Lista!</AlertTitle>
                        <AlertDescription>
                            El sistema generó una tabla con <strong>{selectedFields.length} columnas</strong>. <br />
                            Ahora simplemente copia tus datos de Excel y pégalos abajo.
                        </AlertDescription>
                    </Alert>

                    <Card className="border-2 border-primary/10 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ClipboardPaste className="h-5 w-5 text-primary" /> Pegar Datos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Visual Header Guide */}
                            <div className="flex gap-0 mb-0 overflow-hidden rounded-t-md border-b border-input opacity-70">
                                {selectedFields.map((k, i) => (
                                    <div key={i} className="bg-muted px-3 py-1 text-xs font-mono border-r border-input truncate flex-1 min-w-[10px] text-center" title={Config.fields.find(f => f.key === k)?.label}>
                                        {Config.fields.find(f => f.key === k)?.label}
                                    </div>
                                ))}
                            </div>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                className="flex min-h-[300px] w-full rounded-b-md border border-input bg-background/50 px-3 py-2 text-sm font-mono shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Pega aquí (Ctrl+V)..."
                            />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Ajustar Columnas</Button>
                            <Button onClick={processPastedText} disabled={!pastedText.trim()} size="lg">
                                Revisar Datos <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* STEP 3: Preview */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Vista Previa ({rawData.length} registros)</CardTitle>
                                    <CardDescription>Revisa que todo esté en orden antes de guardar.</CardDescription>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="text-sm py-1 px-3">
                                        Destino: {Config.dbCollection}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-auto max-h-[500px] border-t p-0">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        {entityType === 'expenses' && (
                                            <>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Descripción</TableHead>
                                                <TableHead>Monto</TableHead>
                                                <TableHead>Ingreso/Egreso</TableHead>
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead>Cat.</TableHead>
                                            </>
                                        )}
                                        {entityType === 'attendances' && (
                                            <>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Persona</TableHead>
                                                <TableHead>Entrada</TableHead>
                                                <TableHead>Salida</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </>
                                        )}
                                        {entityType === 'projects' && (
                                            <>
                                                <TableHead>Proyecto</TableHead>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </>
                                        )}
                                        {entityType === 'employees' && (
                                            <>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Cat.</TableHead>
                                                <TableHead>Jornal</TableHead>
                                            </>
                                        )}
                                        {(entityType === 'contractors' || entityType === 'suppliers') && (
                                            <>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>CUIT</TableHead>
                                                <TableHead>Estado/Tipo</TableHead>
                                            </>
                                        )}
                                        {entityType === 'weeklyPayments' && (
                                            <>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Beneficiario</TableHead>
                                                <TableHead>Concepto</TableHead>
                                                <TableHead>Obra</TableHead>
                                                <TableHead>Monto $</TableHead>
                                                <TableHead>Hs/Dias</TableHead>
                                                <TableHead>Tipo</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rawData.slice(0, 50).map((row, i) => (
                                        <TableRow key={i} className={`transition-colors ${row._errors?.length > 0 ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' : 'hover:bg-accent/5'}`}>
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {row._row}
                                                {row._errors?.length > 0 && (
                                                    <span className="block text-[10px] text-red-600 font-bold mt-1">
                                                        ⚠ {row._errors[0]}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {entityType === 'expenses' && (
                                                <>
                                                    <TableCell className="font-medium">{fieldValueToString(row.date)}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate" title={row.description}>{row.description}</TableCell>
                                                    <TableCell>
                                                        <span className={getNumberColor(row.amount)}>
                                                            {formatCurrency(row.amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell><Badge variant={row.type === 'income' ? 'default' : 'secondary'} className={row.type === 'expense' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}>{row.type === 'income' ? 'Ingreso' : 'Egreso'}</Badge></TableCell>
                                                    <TableCell className="text-xs">{row.supplierName || '-'}</TableCell>
                                                    <TableCell className="text-xs">{row.category || '-'}</TableCell>
                                                </>
                                            )}

                                            {entityType === 'attendances' && (
                                                <>
                                                    <TableCell>{fieldValueToString(row.date)}</TableCell>
                                                    <TableCell className="font-medium">{row.personName}</TableCell>
                                                    <TableCell>{row.checkIn || '-'}</TableCell>
                                                    <TableCell>{row.checkOut || '-'}</TableCell>
                                                    <TableCell><Badge>{row.status}</Badge></TableCell>
                                                </>
                                            )}

                                            {entityType === 'projects' && (
                                                <>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>{row.client}</TableCell>
                                                    <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                                                </>
                                            )}

                                            {entityType === 'employees' && (
                                                <>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>{row.category}</TableCell>
                                                    <TableCell>{row.dailyWage}</TableCell>
                                                </>
                                            )}

                                            {(entityType === 'contractors' || entityType === 'suppliers') && (
                                                <>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>{row.cuit || '-'}</TableCell>
                                                    <TableCell><Badge variant="outline">{row.status || row.type}</Badge></TableCell>
                                                </>
                                            )}

                                            {entityType === 'weeklyPayments' && (
                                                <>
                                                    <TableCell>{row.date ? format(new Date(row.date), 'dd/MM') : '-'}</TableCell>
                                                    <TableCell className="font-medium">{row.beneficiary}</TableCell>
                                                    <TableCell>{row.concept}</TableCell>
                                                    <TableCell>{row.project || '-'}</TableCell>
                                                    <TableCell>${row.amount || 0}</TableCell>
                                                    <TableCell>{row.hours || '-'}</TableCell>
                                                    <TableCell><Badge variant="secondary">{row.type || 'Auto'}</Badge></TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {rawData.length > 50 && (
                                <p className="text-center text-xs text-muted-foreground p-4 bg-muted/20">... y {rawData.length - 50} filas más.</p>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between py-6">
                            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Pegar</Button>
                            <Button onClick={executeImport} disabled={isImporting} size="lg" className="gap-2 px-8">
                                {isImporting ? `Guardando (${importProgress.current}/${importProgress.total})...` : 'Confirmar Importación'}
                                {!isImporting && <Save className="h-4 w-4" />}
                            </Button>
                        </CardFooter>
                        {isImporting && (
                            <div className="px-6 pb-6 animate-in fade-in">
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 ease-out"
                                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    Procesando {importProgress.current} de {importProgress.total}...
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}

function fieldValueToString(value: any): string {
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatCurrency(amount: any) {
    const val = parseFloat(amount);
    if (isNaN(val)) return '-';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
}

function getNumberColor(amount: any) {
    const val = parseFloat(amount);
    if (val < 0) return "text-red-500 font-medium";
    if (val > 0) return "text-green-600 font-medium";
    return "text-muted-foreground";
}
