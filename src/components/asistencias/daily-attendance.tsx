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
import { projects, employees } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';

type AttendanceStatus = 'presente' | 'ausente';
interface AttendanceRecord {
  status: AttendanceStatus;
  lateHours: number;
  notes: string;
}

export function DailyAttendance() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProject, setSelectedProject] = useState<string>(projects.find(p => p.status === 'En Curso')?.id || projects[0].id);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) => emp.projectId === selectedProject && emp.status === 'Activo'
    );
  }, [selectedProject]);

  const handleAttendanceChange = (
    employeeId: string,
    field: keyof AttendanceRecord,
    value: string | number
  ) => {
    setAttendance((prev) => {
      const currentRecord = prev[employeeId] || { status: 'presente', lateHours: 0, notes: '' };
      return {
        ...prev,
        [employeeId]: {
          ...currentRecord,
          [field]: value,
        },
      };
    });
  };

  const getEmployeeAttendance = (employeeId: string): AttendanceRecord => {
    return attendance[employeeId] || { status: 'presente', lateHours: 0, notes: '' };
  };

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Asistencia</CardTitle>
          <CardDescription>
            Seleccione la obra y la fecha para registrar la asistencia del personal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project">Obra</Label>
            <Select onValueChange={setSelectedProject} value={selectedProject}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter((p) => p.status === 'En Curso')
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planilla de Asistencia Diaria</CardTitle>
          <CardDescription>
            Marque el estado de cada empleado para la fecha seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Empleado</TableHead>
                  <TableHead className="w-[200px]">Estado</TableHead>
                  <TableHead className="w-[150px]">Horas Tarde</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <RadioGroup
                          value={getEmployeeAttendance(employee.id).status}
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
                        <Input
                          type="number"
                          min="0"
                          className="w-24"
                          value={getEmployeeAttendance(employee.id).lateHours}
                          onChange={(e) =>
                            handleAttendanceChange(employee.id, 'lateHours', parseInt(e.target.value) || 0)
                          }
                          disabled={getEmployeeAttendance(employee.id).status === 'ausente'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Añadir nota..."
                          value={getEmployeeAttendance(employee.id).notes}
                          onChange={(e) =>
                            handleAttendanceChange(employee.id, 'notes', e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay empleados activos en esta obra.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
            <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Asistencias
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
