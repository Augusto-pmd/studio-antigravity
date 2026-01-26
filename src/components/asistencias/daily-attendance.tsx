'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { collection, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Project, Employee } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type AttendanceStatus = 'presente' | 'ausente';
interface AttendanceRecord {
  status: AttendanceStatus;
  lateHours: number;
  notes: string;
  projectId: string | null;
}

const employeeConverter = {
    toFirestore(employee: Employee): DocumentData {
        const { id, ...data } = employee;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): Employee {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            name: data.name || '',
            email: data.email || undefined,
            phone: data.phone || undefined,
            status: data.status || 'Inactivo',
            paymentType: data.paymentType || 'Semanal',
            category: data.category || '',
            dailyWage: data.dailyWage || 0,
            artExpiryDate: data.artExpiryDate || undefined,
        };
    }
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function DailyAttendance() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [lastProjectByEmployee, setLastProjectByEmployee] = useState<Record<string, string>>({});
  const [isClient, setIsClient] = useState(false);

  const { firestore } = useUser();

  const employeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  useEffect(() => {
    setIsClient(true);
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    // When the date changes, we should ideally load the attendance for that date.
    // For now, let's just clear the current attendance state to simulate loading a new day.
    setAttendance({});
  }, [selectedDate]);

  const activeEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(
      (emp) => emp.status === 'Activo'
    );
  }, [employees]);

  const weekDays = useMemo(() => {
    if (!selectedDate) return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);


  const handleAttendanceChange = (
    employeeId: string,
    field: keyof AttendanceRecord,
    value: string | number | null
  ) => {
    const currentAttendanceForEmployee = getEmployeeAttendance(employeeId);

    setAttendance((prev) => {
      const newRecord: AttendanceRecord = {
        ...currentAttendanceForEmployee,
        [field]: value,
      };

      if (field === 'status') {
        if (value === 'presente') {
          if (!newRecord.projectId) { // If toggling back to present and there's no project
            newRecord.projectId = lastProjectByEmployee[employeeId] || null;
          }
        } else if (value === 'ausente') {
          newRecord.projectId = null;
        }
      }
      
      if (field === 'projectId' && typeof value === 'string' && value) {
        setLastProjectByEmployee(prevLastProject => ({
            ...prevLastProject,
            [employeeId]: value
        }));
      }

      return {
        ...prev,
        [employeeId]: newRecord,
      };
    });
  };

  const getEmployeeAttendance = (employeeId: string): AttendanceRecord => {
    return attendance[employeeId] || { 
        status: 'presente', 
        lateHours: 0, 
        notes: '', 
        projectId: lastProjectByEmployee[employeeId] || null 
    };
  };

  const renderAttendanceControls = (employee: Employee) => {
    const employeeAttendance = getEmployeeAttendance(employee.id);
    const isPresent = employeeAttendance.status === 'presente';
    return (
      <>
        <div className="space-y-2">
            <Label>Estado</Label>
            <RadioGroup
                value={employeeAttendance.status}
                onValueChange={(value) => handleAttendanceChange(employee.id, 'status', value as AttendanceStatus)}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                <RadioGroupItem value="presente" id={`mobile-${employee.id}-presente`} />
                <Label htmlFor={`mobile-${employee.id}-presente`}>Presente</Label>
                </div>
                <div className="flex items-center space-x-2">
                <RadioGroupItem value="ausente" id={`mobile-${employee.id}-ausente`} />
                <Label htmlFor={`mobile-${employee.id}-ausente`}>Ausente</Label>
                </div>
            </RadioGroup>
        </div>
        <div className="space-y-2">
            <Label>Obra</Label>
            <Select
                value={employeeAttendance.projectId ?? ''}
                onValueChange={(value) => handleAttendanceChange(employee.id, 'projectId', value)}
                disabled={!isPresent || isLoadingProjects}
            >
                <SelectTrigger>
                <SelectValue placeholder="Asignar Obra" />
                </SelectTrigger>
                <SelectContent>
                {projects
                    ?.filter((p: Project) => p.status === 'En Curso')
                    .map((p: Project) => (
                    <SelectItem key={p.id} value={p.id}>
                        {p.name}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label>Horas Tarde</Label>
            <Input
                type="number"
                min="0"
                value={employeeAttendance.lateHours}
                onChange={(e) => handleAttendanceChange(employee.id, 'lateHours', parseInt(e.target.value) || 0)}
                disabled={!isPresent}
            />
        </div>
        <div className="space-y-2">
            <Label>Observaciones</Label>
             <Input
                type="text"
                placeholder="Añadir nota..."
                value={employeeAttendance.notes}
                onChange={(e) => handleAttendanceChange(employee.id, 'notes', e.target.value)}
            />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtro por Fecha</CardTitle>
          <CardDescription>
            Seleccione la fecha para registrar la asistencia. Puede usar el calendario o la barra de navegación semanal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[240px] justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate && isClient ? format(selectedDate, 'PPP', { locale: es }) : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  initialFocus
                />
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
          <CardTitle>Planilla de Asistencia Diaria</CardTitle>
          <CardDescription>
            Marque el estado de cada empleado y asigne la obra correspondiente para la fecha seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {/* Mobile View */}
           <div className="md:hidden flex flex-col gap-4">
             {isLoadingEmployees ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
             ) : activeEmployees.length > 0 ? (
                activeEmployees.map((employee) => (
                    <Card key={employee.id}>
                        <CardHeader>
                            <CardTitle>{employee.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {renderAttendanceControls(employee)}
                        </CardContent>
                    </Card>
                ))
             ) : (
                <div className="text-center text-muted-foreground py-10">
                    No hay empleados activos en el sistema.
                </div>
             )}
           </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
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
                {isLoadingEmployees ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Cargando empleados...
                    </TableCell>
                  </TableRow>
                ) : activeEmployees.length > 0 ? (
                  activeEmployees.map((employee) => {
                    const employeeAttendance = getEmployeeAttendance(employee.id);
                    const isPresent = employeeAttendance.status === 'presente';

                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          <RadioGroup
                            value={employeeAttendance.status}
                            onValueChange={(value) =>
                              handleAttendanceChange(employee.id, 'status', value as AttendanceStatus)
                            }
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="presente" id={`${employee.id}-presente`} />
                              <Label htmlFor={`${employee.id}-presente`}>Presente</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ausente" id={`${employee.id}-ausente`} />
                              <Label htmlFor={`${employee.id}-ausente`}>Ausente</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={employeeAttendance.projectId ?? ''}
                            onValueChange={(value) => handleAttendanceChange(employee.id, 'projectId', value)}
                            disabled={!isPresent || isLoadingProjects}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Asignar Obra" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects
                                ?.filter((p: Project) => p.status === 'En Curso')
                                .map((p: Project) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            className="w-24"
                            value={employeeAttendance.lateHours}
                            onChange={(e) =>
                              handleAttendanceChange(employee.id, 'lateHours', parseInt(e.target.value) || 0)
                            }
                            disabled={!isPresent}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="Añadir nota..."
                            value={employeeAttendance.notes}
                            onChange={(e) =>
                              handleAttendanceChange(employee.id, 'notes', e.target.value)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay empleados activos en el sistema.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
            <Button disabled>
                <Save className="mr-2 h-4 w-4" />
                Guardar Asistencias
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
