'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useCollection } from '@/firebase';
import { collection, doc, query, where, writeBatch, getDocs, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Project, TimeLog } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Save, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';


interface TimeLogEntry {
  id: string; // Can be a real doc ID or a temp ID
  projectId: string;
  hours: string; // Use string to align with input value type
}

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => {
        const { id, ...rest } = data;
        return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            userId: data.userId,
            date: data.date,
            projectId: data.projectId,
            hours: data.hours,
            description: data.description,
        };
    }
};

export function UserTimeLog() {
  const { user, firestore } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeLogEntries, setTimeLogEntries] = useState<TimeLogEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  const projectsQuery = useMemo(() => (firestore ? query(collection(firestore, 'projects').withConverter(projectConverter), where('status', '==', 'En Curso')) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const formattedDate = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  
  const timeLogsQuery = useMemo(
    () => (user && firestore ? query(collection(firestore, 'timeLogs').withConverter(timeLogConverter), where('userId', '==', user.uid), where('date', '==', formattedDate)) : null),
    [user, firestore, formattedDate]
  );
  const { data: existingLogs, isLoading: isLoadingExistingLogs } = useCollection<TimeLog>(timeLogsQuery);

  // --- Monthly Summary Data ---
  const { monthStart, monthEnd, currentMonthName } = useMemo(() => {
    const referenceDate = selectedDate;
    return {
        monthStart: format(startOfMonth(referenceDate), 'yyyy-MM-dd'),
        monthEnd: format(endOfMonth(referenceDate), 'yyyy-MM-dd'),
        currentMonthName: format(referenceDate, 'MMMM yyyy', { locale: es }),
    }
  }, [selectedDate]);

  const monthlyLogsQuery = useMemo(
      () => (user && firestore ? query(
          collection(firestore, 'timeLogs').withConverter(timeLogConverter), 
          where('userId', '==', user.uid),
          where('date', '>=', monthStart),
          where('date', '<=', monthEnd)
      ) : null),
      [user, firestore, monthStart, monthEnd]
  );

  const { data: monthlyLogs, isLoading: isLoadingMonthlyLogs } = useCollection<TimeLog>(monthlyLogsQuery);

  const monthlySummary = useMemo(() => {
    if (!monthlyLogs || !projects) return [];

    const summary = new Map<string, number>();
    monthlyLogs.forEach((log: TimeLog) => {
        const currentHours = summary.get(log.projectId) || 0;
        summary.set(log.projectId, currentHours + Number(log.hours || 0));
    });

    return Array.from(summary.entries()).map(([projectId, hours]) => {
        const project = projects.find((p: Project) => p.id === projectId);
        return {
            projectId,
            projectName: project?.name || 'Obra Desconocida',
            totalHours: hours,
        };
    }).sort((a, b) => b.totalHours - a.totalHours);

  }, [monthlyLogs, projects]);
  
  const totalMonthlyHours = useMemo(() => {
    if (!monthlyLogs) return 0;
    return monthlyLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
  }, [monthlyLogs]);
  // --- End Monthly Summary Data ---

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isLoadingExistingLogs) {
      // While loading, don't change the current entries to prevent flickering
      return;
    }
    if (existingLogs) {
      if (existingLogs.length > 0) {
        setTimeLogEntries(
          existingLogs.map((log: TimeLog) => ({
            id: log.id,
            projectId: log.projectId,
            hours: log.hours.toString(),
          }))
        );
      } else {
        // If no logs exist for the selected date, clear the entries
        setTimeLogEntries([]);
      }
    }
  }, [existingLogs, isLoadingExistingLogs]);


  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const totalHours = useMemo(() => timeLogEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0), [timeLogEntries]);
  
  const addEntry = () => {
    setTimeLogEntries([...timeLogEntries, { id: `temp-${Date.now()}`, projectId: '', hours: '0' }]);
  };

  const removeEntry = (id: string) => {
    setTimeLogEntries(timeLogEntries.filter(entry => entry.id !== id));
  };
  
  const updateEntry = (id: string, field: 'projectId' | 'hours', value: string) => {
    setTimeLogEntries(timeLogEntries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const handleSaveLogs = useCallback(async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }
    if (timeLogEntries.some(entry => !entry.projectId || !entry.hours || Number(entry.hours) <= 0)) {
        toast({ variant: 'destructive', title: 'Datos Incompletos', description: 'Asegúrese de seleccionar una obra y asignar horas (mayores a 0) a cada entrada.' });
        return;
    }
    
    setIsSaving(true);
    try {
        const dateToSave = format(selectedDate, 'yyyy-MM-dd');
        
        // 1. Find all existing documents for this user and day inside this function
        const logsCollectionRef = collection(firestore, 'timeLogs');
        const q = query(logsCollectionRef, where('userId', '==', user.uid), where('date', '==', dateToSave));
        const docsToDeleteSnap = await getDocs(q);

        const batch = writeBatch(firestore);

        // 2. Schedule them for deletion
        docsToDeleteSnap.forEach((document: any) => {
            batch.delete(document.ref);
        });

        // 3. Schedule new ones for creation from UI state
        timeLogEntries.forEach(entry => {
          if (entry.projectId && Number(entry.hours) > 0) {
            const docRef = doc(logsCollectionRef);
            const logData: Omit<TimeLog, 'id'> = {
              userId: user.uid,
              date: dateToSave,
              projectId: entry.projectId,
              hours: Number(entry.hours),
            };
            batch.set(docRef, logData);
          }
        });

        // 4. Commit all changes at once
        await batch.commit();

        toast({ title: 'Horas Guardadas', description: `Se han guardado ${totalHours} horas para el día ${format(selectedDate, 'dd/MM/yyyy', { locale: es })}.` });
      } catch (error) {
        console.error("Error saving time logs:", error);
        toast({ variant: 'destructive', title: 'Error al Guardar', description: 'No se pudieron guardar los registros. Es posible que no tengas permisos.' });
      } finally {
        setIsSaving(false);
      }
  }, [firestore, user, selectedDate, timeLogEntries, toast, totalHours]);

  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Selección de Fecha</CardTitle>
                <CardDescription>
                    Navegue por la semana o use el calendario para elegir el día a registrar.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={'outline'}
                        className={cn('w-full sm:w-[240px] justify-start text-left font-normal',!selectedDate && 'text-muted-foreground')}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isClient ? format(selectedDate, 'PPP', { locale: es }) : <span>Cargando...</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={es} />
                    </PopoverContent>
                    </Popover>
                    <div className="flex-1 flex justify-center items-center gap-1 rounded-md bg-muted p-1 flex-wrap">
                    {isClient && weekDays.map((day: Date) => (
                        <Button
                        key={day.toISOString()}
                        variant={selectedDate && isSameDay(day, selectedDate) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSelectedDate(day)}
                        className="flex flex-col h-auto px-3 py-1 text-center"
                        >
                        <span className="text-xs capitalize">{format(day, 'E', { locale: es })}</span>
                        <span className="font-bold">{format(day, 'd')}</span>
                        </Button>
                    ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>Total de Horas del Mes <span className="capitalize">({currentMonthName})</span></CardTitle>
                    <CardDescription>
                        Suma de todas las horas cargadas en el mes seleccionado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingMonthlyLogs ? (
                        <Skeleton className="h-16 w-1/2" />
                    ) : (
                        <div className="text-5xl font-bold font-mono">{totalMonthlyHours} <span className="text-2xl text-muted-foreground font-sans">hs</span></div>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Desglose por Proyecto <span className="capitalize">({currentMonthName})</span></CardTitle>
                     <CardDescription>Total de horas por proyecto en el mes seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proyecto</TableHead>
                                <TableHead className="text-right">Horas Totales</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isLoadingMonthlyLogs || isLoadingProjects) ? (
                                <>
                                    <TableRow>
                                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                    </TableRow>
                                </>
                            ) : monthlySummary.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No hay horas registradas para este mes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                            monthlySummary.map((summary: any) => (
                                <TableRow key={summary.projectId}>
                                    <TableCell className="font-medium">{summary.projectName}</TableCell>
                                    <TableCell className="text-right font-mono">{summary.totalHours}</TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Carga de Horas del Día</CardTitle>
                <CardDescription>
                    Distribuya sus horas de trabajo del día seleccionado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoadingExistingLogs ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : timeLogEntries.length > 0 ? (
                        timeLogEntries.map((entry, index) => (
                            <div key={entry.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 rounded-md border">
                                <div>
                                    <Label htmlFor={`project-${index}`} className="sr-only">Obra</Label>
                                    <Select value={entry.projectId} onValueChange={(val) => updateEntry(entry.id, 'projectId', val)} disabled={isLoadingProjects}>
                                        <SelectTrigger id={`project-${index}`}>
                                            <SelectValue placeholder="Seleccione una obra" />
                                        </SelectTrigger>
                                        <SelectContent>
                                        {projects?.map((p: Project) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor={`hours-${index}`} className="sr-only">Horas</Label>
                                    <Input 
                                        id={`hours-${index}`} 
                                        type="number"
                                        value={entry.hours}
                                        onChange={(e) => updateEntry(entry.id, 'hours', e.target.value)}
                                        className="w-24 text-right"
                                        placeholder="Horas"
                                    />
                                </div>
                                 <Button variant="ghost" size="icon" onClick={() => removeEntry(entry.id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            No hay horas cargadas para este día.
                        </div>
                    )}
                     <Button variant="outline" onClick={addEntry} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Entrada
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4 rounded-b-lg">
                <div className="text-lg">
                    Total de Horas: <span className="font-bold font-mono">{totalHours}</span>
                </div>
                <Button onClick={handleSaveLogs} disabled={isSaving || isLoadingExistingLogs}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Horas
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}

    