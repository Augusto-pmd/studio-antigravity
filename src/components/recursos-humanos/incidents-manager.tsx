'use client';

import { useState, useTransition } from 'react';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Plus, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCollection } from '@/firebase';
import { attendanceConverter } from '@/lib/converters';
import type { Attendance, PayrollWeek } from '@/lib/types';

interface IncidentsManagerProps {
    employeeId: string;
}

export function IncidentsManager({ employeeId }: IncidentsManagerProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<'LATE' | 'ABSENCE'>('LATE');
    const [hours, setHours] = useState('');
    const [reason, setReason] = useState<Attendance['reason'] | undefined>();
    const [notes, setNotes] = useState('');

    // data fetching for list
    // We want to show recent incidents for this employee
    const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', employeeId),
        where('source', '==', 'MANUAL'), // Only show manually added ones here? Or all? User wants to see incidents.
        // Ideally we filter by status=ausente OR lateHours > 0. Firestore OR is tricky.
        // Let's fetch recent 20Manual and filter client side for now.
        orderBy('date', 'desc'),
        limit(20)
    ).withConverter(attendanceConverter);

    const { data: recentRecords, isLoading } = useCollection(q);

    const incidents = recentRecords?.filter((r: Attendance) => r.lateHours > 0 || r.status === 'ausente') || [];

    const handleSave = async () => {
        if (!date) {
            toast({ variant: 'destructive', title: 'Fecha requerida' });
            return;
        }
        if (type === 'LATE' && !hours) {
            toast({ variant: 'destructive', title: 'Horas requeridas para llegada tarde' });
            return;
        }
        if (type === 'ABSENCE' && !reason) {
            toast({ variant: 'destructive', title: 'Motivo requerido para ausencia' });
            return;
        }

        startTransition(async () => {
            try {
                const dateStr = format(date, 'yyyy-MM-dd');

                // 1. Find or Create Payroll Week
                let weekId = '';

                // Create new week (Monday to Sunday)
                const monday = startOfWeek(date, { weekStartsOn: 1 });
                const sunday = endOfWeek(date, { weekStartsOn: 1 });
                const mondayStr = format(monday, 'yyyy-MM-dd');

                const weeksRef = collection(db, 'payrollWeeks');
                // Check if week exists containing this date
                const weekQ = query(weeksRef, where('startDate', '==', mondayStr), limit(1));
                const weekSnap = await getDocs(weekQ);

                if (!weekSnap.empty) {
                    weekId = weekSnap.docs[0].id;
                } else {
                    const newWeek: PayrollWeek = {
                        id: '', // firestore auto-id
                        startDate: mondayStr,
                        endDate: format(sunday, 'yyyy-MM-dd'),
                    };

                    const ref = await addDoc(weeksRef, newWeek);
                    weekId = ref.id;
                }

                // 2. Create Attendance Record
                const attendanceData: Partial<Attendance> = {
                    employeeId,
                    date: dateStr,
                    payrollWeekId: weekId,
                    source: 'MANUAL',
                    notes: notes,
                };

                if (type === 'LATE') {
                    attendanceData.status = 'presente';
                    attendanceData.lateHours = parseFloat(hours);
                } else {
                    attendanceData.status = 'ausente';
                    attendanceData.lateHours = 0;
                    attendanceData.reason = reason;
                }

                await addDoc(collection(db, 'attendance'), attendanceData);

                toast({ title: 'Incidencia Registrada', description: 'Se ha guardado correctamente.' });
                setOpen(false);
                // Reset form
                setHours('');
                setNotes('');
                setReason(undefined);

            } catch (error) {
                console.error("Error saving incident:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar.' });
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            await deleteDoc(doc(db, 'attendance', id));
            toast({ title: 'Registro eliminado' });
        } catch (error) {
            console.error("Error deleting:", error);
            toast({ variant: 'destructive', title: 'Error al eliminar' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Registro de Incidencias</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Incidencia
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Incidencia</DialogTitle>
                            <DialogDescription>
                                Llegadas tarde, ausencias o licencias.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label>Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Seleccionar fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Tipo de Incidencia</Label>
                                <Select value={type} onValueChange={(v: 'LATE' | 'ABSENCE') => setType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LATE">Llegada Tarde</SelectItem>
                                        <SelectItem value="ABSENCE">Ausencia / Falta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {type === 'LATE' && (
                                <div className="flex flex-col gap-2">
                                    <Label>Horas Tarde</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        placeholder="Ej. 1.5"
                                        value={hours}
                                        onChange={(e) => setHours(e.target.value)}
                                    />
                                </div>
                            )}

                            {type === 'ABSENCE' && (
                                <div className="flex flex-col gap-2">
                                    <Label>Motivo</Label>
                                    <Select value={reason} onValueChange={(v: string) => setReason(v as Attendance['reason'])}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione motivo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Falta Injustificada">Falta Injustificada</SelectItem>
                                            <SelectItem value="Enfermedad">Enfermedad</SelectItem>
                                            <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                                            <SelectItem value="Licencia">Licencia</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <Label>Notas (Opcional)</Label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comentarios adicionales..." />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {isLoading && <div>Cargando...</div>}
                {!isLoading && incidents.length === 0 && (
                    <div className="text-center p-8 border rounded-lg text-muted-foreground bg-slate-50">
                        No hay incidencias registradas recientemente.
                    </div>
                )}
                {incidents.map((record) => (
                    <Card key={record.id}>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    {record.status === 'ausente' ? (
                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                    ) : (
                                        <Clock className="h-5 w-5 text-orange-500" />
                                    )}
                                    <CardTitle className="text-base">
                                        {record.status === 'ausente' ? 'Ausencia' : 'Llegada Tarde'}
                                    </CardTitle>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {format(parseISO(record.date), 'dd/MM/yyyy')}
                                </div>
                            </div>
                            <CardDescription>
                                {record.status === 'ausente' ? record.reason : `${record.lateHours} horas`}
                            </CardDescription>
                        </CardHeader>
                        {record.notes && (
                            <CardContent className="p-4 pt-0 text-sm text-slate-600">
                                Nota: {record.notes}
                            </CardContent>
                        )}
                        <div className="px-4 pb-2 flex justify-end">
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-6" onClick={() => handleDelete(record.id)}>
                                <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
