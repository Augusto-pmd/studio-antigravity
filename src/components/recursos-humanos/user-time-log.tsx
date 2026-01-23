'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
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
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import type { Project, TimeLog } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Save, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface TimeLogEntry {
  id: string; // Temp ID for React key
  projectId: string;
  hours: number;
}

export function UserTimeLog() {
  const { user, firestore } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeLogEntries, setTimeLogEntries] = useState<TimeLogEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  const projectsQuery = useMemo(() => (firestore ? query(collection(firestore, 'projects'), where('status', '==', 'En Curso')) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const formattedDate = useMemo(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null, [selectedDate]);
  
  const timeLogsQuery = useMemo(
    () => (user && firestore && formattedDate ? query(collection(firestore, 'timeLogs'), where('userId', '==', user.uid), where('date', '==', formattedDate)) : null),
    [user, firestore, formattedDate]
  );
  const { data: existingLogs, isLoading: isLoadingExistingLogs } = useCollection<TimeLog>(timeLogsQuery);

  useEffect(() => {
    setIsClient(true);
    setSelectedDate(new Date());
  }, []);
  
  useEffect(() => {
    if (existingLogs) {
      if (existingLogs.length > 0) {
        const entries = existingLogs.map(log => ({
          id: log.id,
          projectId: log.projectId,
          hours: log.hours,
        }));
        setTimeLogEntries(entries);
      } else {
        setTimeLogEntries([{ id: `temp-${Date.now()}`, projectId: '', hours: 8 }]);
      }
    }
  }, [existingLogs]);


  const weekDays = useMemo(() => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const totalHours = useMemo(() => timeLogEntries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0), [timeLogEntries]);
  
  const addEntry = () => {
    setTimeLogEntries([...timeLogEntries, { id: `temp-${Date.now()}`, projectId: '', hours: 0 }]);
  };

  const removeEntry = (id: string) => {
    setTimeLogEntries(timeLogEntries.filter(entry => entry.id !== id));
  };
  
  const updateEntry = (id: string, field: 'projectId' | 'hours', value: string | number) => {
    setTimeLogEntries(timeLogEntries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const handleSaveLogs = () => {
    if (!firestore || !user || !selectedDate) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos o la fecha no es válida.' });
        return;
    }
    if (timeLogEntries.some(entry => !entry.projectId || entry.hours <= 0)) {
        toast({ variant: 'destructive', title: 'Datos Incompletos', description: 'Asegúrese de seleccionar una obra y asignar horas a cada entrada.' });
        return;
    }
    
    const currentFormattedDate = format(selectedDate, 'yyyy-MM-dd');

    startTransition(() => {
        const batch = writeBatch(firestore);

        // Delete old logs for this day that are no longer in the entries
        existingLogs?.forEach(oldLog => {
            if (!timeLogEntries.some(entry => entry.id === oldLog.id)) {
                const docRef = doc(firestore, 'timeLogs', oldLog.id);
                batch.delete(docRef);
            }
        });

        let batchedLogs: any[] = [];
        // Set/Update current entries
        timeLogEntries.forEach(entry => {
            const isNew = entry.id.startsWith('temp-');
            const docRef = isNew 
                ? doc(collection(firestore, 'timeLogs')) 
                : doc(firestore, 'timeLogs', entry.id);
            
            const logData: Omit<TimeLog, 'id'> = {
                userId: user.uid,
                date: currentFormattedDate,
                projectId: entry.projectId,
                hours: Number(entry.hours),
            };
            batchedLogs.push(logData);
            
            if (isNew) {
                batch.set(docRef, logData);
            } else {
                batch.update(docRef, logData);
            }
        });

        batch.commit()
            .then(() => {
                toast({ title: 'Horas Guardadas', description: `Se han guardado ${totalHours} horas para el día ${format(selectedDate, 'dd/MM/yyyy')}.` });
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: 'timeLogs (batch)',
                    operation: 'write',
                    requestResourceData: batchedLogs,
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Error al Guardar', description: 'No se pudieron guardar los registros de horas. Es posible que no tengas permisos.' });
            });
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
                        {selectedDate && isClient ? format(selectedDate, 'PPP', { locale: es }) : <span>Cargando...</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={es} />
                    </PopoverContent>
                    </Popover>
                    <div className="flex-1 flex justify-center items-center gap-1 rounded-md bg-muted p-1 flex-wrap">
                    {isClient && weekDays.map(day => (
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

        <Card>
            <CardHeader>
                <CardTitle>Carga de Horas del Día</CardTitle>
                <CardDescription>
                    Distribuya sus horas de trabajo entre los distintos proyectos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {(isLoadingExistingLogs) && <p>Cargando horas...</p>}
                    {!isLoadingExistingLogs && timeLogEntries.map((entry, index) => (
                        <div key={entry.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 rounded-md border">
                            <div>
                                <Label htmlFor={`project-${index}`} className="sr-only">Obra</Label>
                                <Select value={entry.projectId} onValueChange={(val) => updateEntry(entry.id, 'projectId', val)} disabled={isLoadingProjects}>
                                    <SelectTrigger id={`project-${index}`}>
                                        <SelectValue placeholder="Seleccione una obra" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                    ))}
                     <Button variant="outline" onClick={addEntry} className="w-full" disabled={!selectedDate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Otra Obra
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4 rounded-b-lg">
                <div className="text-lg">
                    Total de Horas: <span className="font-bold font-mono">{totalHours}</span>
                </div>
                <Button onClick={handleSaveLogs} disabled={isPending || timeLogEntries.length === 0}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Horas
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
