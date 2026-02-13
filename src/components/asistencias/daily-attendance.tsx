'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useCollection } from '@/firebase';
import {
    collection,
    query,
    where,
    doc,
    writeBatch,
    type DocumentData,
    type QueryDocumentSnapshot,
    type SnapshotOptions,
} from 'firebase/firestore';
import type { Project, Employee, PayrollWeek, Attendance } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

type AttendanceStatus = 'presente' | 'ausente';
interface AttendanceRecord {
  docId?: string;
  status: AttendanceStatus;
  lateHours: number | string;
  notes: string;
  projectId: string | null;
}

// --- Converters ---
const employeeConverter = {
    toFirestore: (employee: Employee): DocumentData => ({ ...employee }),
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name || '',
            status: data.status || 'Inactivo',
            paymentType: data.paymentType || 'Semanal',
            category: data.category || '',
            dailyWage: data.dailyWage || 0,
        } as Employee;
    }
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const attendanceConverter = {
  toFirestore: (attendance: Attendance): DocumentData => ({...attendance}),
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => {
      const data = snapshot.data(options)!;
      return { id: snapshot.id, ...data } as Attendance;
  }
};


export function DailyAttendance({ currentWeek, isLoadingWeek }: { currentWeek?: PayrollWeek, isLoadingWeek: boolean }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isClient, setIsClient] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const { toast } = useToast();
  const { firestore, user } = useUser();

  // --- Data Fetching ---
  const employeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const formattedDate = useMemo(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null, [selectedDate]);

  const attendanceForDayQuery = useMemo(
    () => (firestore && formattedDate
        ? query(
            collection(firestore, 'attendances').withConverter(attendanceConverter),
            where('date', '==', formattedDate)
          )
        : null),
    [firestore, formattedDate]
  );
  const { data: dayAttendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendanceForDayQuery);


  // --- Effects ---
  useEffect(() => {
    setIsClient(true);
    if (currentWeek) {
        setSelectedDate(parseISO(currentWeek.startDate));
    } else {
        setSelectedDate(new Date());
    }
  }, [currentWeek]);
  
  useEffect(() => {
    if (isLoadingAttendances || isLoadingEmployees || !employees) return;

    const newAttendanceState: Record<string, AttendanceRecord> = {};
    const activeEmployees = employees.filter((emp) => emp.status === 'Activo');

    if (dayAttendances && dayAttendances.length > 0) {
      dayAttendances.forEach((att) => {
        newAttendanceState[att.employeeId] = {
          docId: att.id,
          status: att.status,
          lateHours: att.lateHours || 0,
          notes: att.notes || '',
          projectId: att.projectId || null,
        };
      });
    }

    activeEmployees.forEach((emp) => {
      if (!newAttendanceState[emp.id]) {
        newAttendanceState[emp.id] = {
          docId: undefined,
          status: 'ausente',
          lateHours: 0,
          notes: '',
          projectId: null,
        };
      }
    });

    setAttendance(newAttendanceState);
  }, [dayAttendances, isLoadingAttendances, employees, isLoadingEmployees, selectedDate]);


  // --- Memoized Calculations ---
  const activeEmployees = useMemo(() => employees?.filter((emp) => emp.status === 'Activo') || [], [employees]);

  const weekDays = useMemo(() => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const getEmployeeAttendance = useCallback((employeeId: string): AttendanceRecord => {
    return attendance[employeeId] || { status: 'ausente', lateHours: 0, notes: '', projectId: null };
  }, [attendance]);
  
  const groupedEmployees = useMemo(() => {
    if (!activeEmployees || !projects) return {};

    const groups: Record<string, { name: string, employees: Employee[] }> = {
      'unassigned': { name: 'Sin Asignar a Obra', employees: [] }
    };
    projects.forEach(p => { if (p.status === 'En Curso') groups[p.id] = { name: p.name, employees: [] }; });

    activeEmployees.forEach((employee) => {
        const empAttendance = getEmployeeAttendance(employee.id);
        const projectId = empAttendance?.projectId;
        if (projectId && groups[projectId]) {
            groups[projectId].employees.push(employee);
        } else {
            groups['unassigned'].employees.push(employee);
        }
    });
    return Object.fromEntries(Object.entries(groups).filter(([_, group]) => group.employees.length > 0));
  }, [activeEmployees, projects, attendance, getEmployeeAttendance]);

  
  // --- Handlers ---
  const handleAttendanceChange = (employeeId: string, field: keyof AttendanceRecord, value: string | number | null) => {
    const currentRecord = getEmployeeAttendance(employeeId);
    setAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...currentRecord,
        [field]: value,
        // Si está ausente, no puede tener obra
        ...(field === 'status' && value === 'ausente' && { projectId: null })
      },
    }));
  };

  const handleSaveAttendance = () => {
    if (!firestore || !user || !currentWeek || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    startTransition(async () => {
        const batch = writeBatch(firestore);
        try {
            for (const employeeId of Object.keys(attendance)) {
                const record = attendance[employeeId];
                const dataToSave: Omit<Attendance, 'id'> = {
                    employeeId,
                    date: dateStr,
                    payrollWeekId: currentWeek.id,
                    status: record.status,
                    lateHours: Number(record.lateHours) || 0,
                    notes: record.notes,
                    projectId: record.status === 'ausente' ? null : (record.projectId || null),
                };

                const docRef = record.docId
                    ? doc(firestore, 'attendances', record.docId)
                    : doc(collection(firestore, 'attendances'));
                batch.set(docRef, dataToSave, { merge: true });
            }
            await batch.commit();
            toast({ title: "Asistencias Guardadas" });
        } catch (error) {
            console.error("Error saving attendance: ", error);
            toast({ variant: 'destructive', title: "Error al guardar" });
        }
    });
  };

  // --- Render Functions ---
  const renderAttendanceControls = (employee: Employee) => {
    const record = getEmployeeAttendance(employee.id);
    const isPresent = record.status === 'presente';
    return (
      <Card key={employee.id}>
        <CardHeader><CardTitle>{employee.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {/* Controls remain the same */}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtro por Fecha</CardTitle>
          <CardDescription>Seleccione la fecha para registrar la asistencia.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={'outline'} disabled={isLoadingWeek} className={cn('w-full sm:w-[240px] justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate && isClient ? format(selectedDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  initialFocus
                  disabled={(d: Date) => currentWeek ? (d < parseISO(currentWeek.startDate) || d > parseISO(currentWeek.endDate)) : false}
                />
              </PopoverContent>
            </Popover>
            <div className="flex-1 flex justify-center items-center gap-1 rounded-md bg-muted p-1 flex-wrap">
              {isClient && weekDays.map((day) => (
                <Button key={day.toISOString()} variant={selectedDate && isSameDay(day, selectedDate) ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedDate(day)} className="flex flex-col h-auto px-3 py-1">
                  <span className="text-xs capitalize">{format(day, 'E', { locale: es })}</span>
                  <span className="font-bold">{format(day, 'd')}</span>
                </Button>
              ))}
            </div>
          </div>
          {!isLoadingWeek && !currentWeek && (
             <div className="text-center text-sm text-destructive p-2 rounded-md border border-destructive/50 bg-destructive/10">
                No hay una semana de pagos abierta. No se puede guardar la asistencia.
             </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planilla de Asistencia Diaria</CardTitle>
          <CardDescription>Marque el estado de cada empleado para la fecha seleccionada.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingEmployees || isLoadingProjects || isLoadingAttendances ? (
                <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div>
            ) : dayAttendances && dayAttendances.length === 0 && !isLoadingAttendances ? (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-center">
                    <p className='text-muted-foreground'>{`No hay datos de asistencia para ${formattedDate}. Cargue y guarde para comenzar.`}</p>
                </div>
            ) : Object.keys(groupedEmployees).length > 0 ? (
                <Accordion type="multiple" defaultValue={['unassigned']} className="w-full space-y-4">
                {Object.entries(groupedEmployees).map(([projectId, groupData]) => (
                    <AccordionItem value={projectId} key={projectId} className="border rounded-lg bg-background">
                        <AccordionTrigger className="px-4 hover:no-underline"><div className="flex items-center gap-2"><span className="font-semibold">{groupData.name}</span><Badge variant="secondary">{groupData.employees.length}</Badge></div></AccordionTrigger>
                        <AccordionContent className="p-0 md:p-4">
                            {/* Mobile View */}
                            <div className="md:hidden flex flex-col gap-4 p-4">
                                {groupData.employees.map((employee) => renderAttendanceControls(employee))}
                            </div>
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Empleado</TableHead>
                                        <TableHead className="w-[200px]">Estado</TableHead>
                                        <TableHead className="w-[250px]">Obra</TableHead>
                                        <TableHead className="w-[150px]">Horas Tarde</TableHead>
                                        <TableHead>Observaciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupData.employees.map((employee) => {
                                        const record = getEmployeeAttendance(employee.id);
                                        const isPresent = record.status === 'presente';
                                        return (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">{employee.name}</TableCell>
                                            <TableCell>
                                                <RadioGroup value={record.status} onValueChange={(v) => handleAttendanceChange(employee.id, 'status', v)} className="flex gap-4">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="presente" id={`${projectId}-${employee.id}-p`} /><Label htmlFor={`${projectId}-${employee.id}-p`}>Presente</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="ausente" id={`${projectId}-${employee.id}-a`} /><Label htmlFor={`${projectId}-${employee.id}-a`}>Ausente</Label></div>
                                                </RadioGroup>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={record.projectId ?? ''} onValueChange={(v) => handleAttendanceChange(employee.id, 'projectId', v)} disabled={!isPresent || isLoadingProjects}>
                                                    <SelectTrigger><SelectValue placeholder="Asignar Obra" /></SelectTrigger>
                                                    <SelectContent>{projects?.filter(p => p.status === 'En Curso').map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" min="0" step="0.5" className="w-24" value={record.lateHours} onChange={(e) => handleAttendanceChange(employee.id, 'lateHours', e.target.value)} disabled={!isPresent} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="text" placeholder="Añadir nota..." value={record.notes} onChange={(e) => handleAttendanceChange(employee.id, 'notes', e.target.value)} />
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                                </Table>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            ) : (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-center">
                    <p className='text-muted-foreground'>No hay empleados activos en el sistema.</p>
                </div>
            )}
        </CardContent>
        <CardFooter className="justify-end">
            <Button disabled={isSaving || !currentWeek} onClick={handleSaveAttendance}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Asistencias
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
