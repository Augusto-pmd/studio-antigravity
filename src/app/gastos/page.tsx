'use client';

import { useState, useMemo } from 'react';
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { useUser, useCollection, useFirestore } from "@/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { collection, collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { Project, Supplier, Expense, TimeLog, TechnicalOfficeEmployee, Employee, Attendance, DailyWageHistory } from '@/lib/types';
import { expenseCategories } from '@/lib/data';
import { dailyWageHistoryConverter } from '@/lib/converters';

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(options), id: snapshot.id } as Supplier)
};

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id, status: snapshot.data(options)!.status } as Expense)
};

const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => ({ ...snapshot.data(options), id: snapshot.id } as TimeLog)
};

const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => ({ ...snapshot.data(options), id: snapshot.id } as TechnicalOfficeEmployee)
};

const employeeConverter = {
    toFirestore: (data: Employee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee)
};

const attendanceConverter = {
    toFirestore: (data: Attendance): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => ({ ...snapshot.data(options), id: snapshot.id } as Attendance)
};


export default function GastosPage() {
  const { permissions } = useUser();
  const firestore = useFirestore();

  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all data sources
  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const suppliersQuery = useMemo(() => (firestore ? collection(firestore, 'suppliers').withConverter(supplierConverter) : null), [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const allExpensesQuery = useMemo(() => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null), [firestore]);
  const { data: allExpenses, isLoading: isLoadingAllExpenses } = useCollection<Expense>(allExpensesQuery);

  const allTimeLogsQuery = useMemo(() => (firestore ? collection(firestore, 'timeLogs').withConverter(timeLogConverter) : null), [firestore]);
  const { data: allTimeLogs, isLoading: isLoadingAllTimeLogs } = useCollection<TimeLog>(allTimeLogsQuery);

  const techOfficeEmployeesQuery = useMemo(() => (firestore ? collection(firestore, 'technicalOfficeEmployees').withConverter(techOfficeEmployeeConverter) : null), [firestore]);
  const { data: techOfficeEmployees, isLoading: isLoadingTechOffice } = useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

  const siteEmployeesQuery = useMemo(() => (firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null), [firestore]);
  const { data: siteEmployees, isLoading: isLoadingSiteEmployees } = useCollection<Employee>(siteEmployeesQuery);

  const attendancesQuery = useMemo(() => (firestore ? collection(firestore, 'attendances').withConverter(attendanceConverter) : null), [firestore]);
  const { data: attendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendancesQuery);

  const wageHistoriesQuery = useMemo(() => (firestore ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore]);
  const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);


  const isLoading = isLoadingProjects || isLoadingSuppliers || isLoadingAllExpenses || isLoadingAllTimeLogs || isLoadingTechOffice || isLoadingSiteEmployees || isLoadingAttendances || isLoadingWageHistories;

  // Create virtual expenses for office hours
  const officeExpenses = useMemo((): Expense[] => {
    if (!allTimeLogs || !techOfficeEmployees) return [];

    const employeeSalaryMap = new Map(techOfficeEmployees.map((e: TechnicalOfficeEmployee) => [e.userId, { salary: e.monthlySalary, name: e.fullName }]));

    return allTimeLogs.map((log: any): Expense | null => {
      const employeeData = employeeSalaryMap.get(log.userId);
      if (!employeeData) return null;

      // Assume 160 working hours in a month.
      const hourlyRate = employeeData.salary / 160;
      const cost = log.hours * hourlyRate;

      return {
        id: `log-${log.id}`, // Unique ID for virtual expense
        projectId: log.projectId,
        date: log.date, // TimeLog date is already YYYY-MM-DD
        supplierId: 'OFICINA-TECNICA',
        categoryId: 'CAT-14',
        documentType: 'Recibo Común',
        amount: cost,
        currency: 'ARS',
        exchangeRate: 1,
        status: 'Pagado',
        description: `Costo Horas: ${employeeData.name}`,
      } as Expense; // Cast to Expense, even though it's partial
    }).filter((e): e is Expense => e !== null);
  }, [allTimeLogs, techOfficeEmployees]);

  // Create virtual expenses for site payroll
  const payrollExpenses = useMemo((): Expense[] => {
    if (!attendances || !siteEmployees || !wageHistories) return [];
    
    const employeeNameMap = new Map(siteEmployees.map((e: Employee) => [e.id, e.name]));

    const getWageForDate = (employeeId: string, date: string): number => {
      const histories = wageHistories
          .filter((h: any) => h.employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
          .sort((a: any, b: any) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

      if (histories.length > 0) {
          return histories[0].amount;
      }
      
      const currentEmployee = siteEmployees.find((e: Employee) => e.id === employeeId);
      return currentEmployee?.dailyWage || 0;
  };

    return attendances.map((att: Attendance): Expense | null => {
        if (att.status !== 'presente' || !att.projectId) return null;
        
        const employeeName = employeeNameMap.get(att.employeeId);
        if (!employeeName) return null;

        const wage = getWageForDate(att.employeeId, att.date);

        return {
            id: `payroll-${att.id}`, // Unique ID for virtual expense
            projectId: att.projectId,
            date: att.date, // Attendance date is already YYYY-MM-DD
            supplierId: 'personal-propio',
            categoryId: 'CAT-02', // Mano de Obra (Subcontratos)
            documentType: 'Recibo Común',
            amount: wage,
            currency: 'ARS',
            exchangeRate: 1,
            status: 'Pagado',
            description: `Costo Jornal: ${employeeName}`,
            payrollWeekId: att.payrollWeekId,
        } as Expense;
    }).filter((e): e is Expense => e !== null);
  }, [attendances, siteEmployees, wageHistories]);


  // Create maps for display names
  const projectsMap = useMemo(() => projects?.reduce((acc: Record<string, string>, p: any) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>) || {}, [projects]);
  const suppliersMap = useMemo(() => {
    const map = suppliers?.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>) || {};
    map['OFICINA-TECNICA'] = 'Oficina Técnica';
    map['personal-propio'] = 'Personal Propio';
    map['solicitudes-fondos'] = 'Solicitudes de Fondos (Interno)';
    map['logistica-vial'] = 'Gastos de Caja (Rápidos)';
    return map;
  }, [suppliers]);

  // Combine real and virtual expenses, then filter
  const displayedExpenses = useMemo(() => {
    const combined = [...(allExpenses || []), ...officeExpenses, ...payrollExpenses];
    return combined.filter((expense: Expense) => {
      const projectMatch = !selectedProject || expense.projectId === selectedProject;
      const supplierMatch = !selectedSupplier || expense.supplierId === selectedSupplier;
      const categoryMatch = !selectedCategory || expense.categoryId === selectedCategory;
      const searchMatch = !searchQuery ||
                          (expense.description && expense.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (expense.invoiceNumber && expense.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      return projectMatch && supplierMatch && categoryMatch && searchMatch;
    });
  }, [allExpenses, officeExpenses, payrollExpenses, selectedProject, selectedSupplier, selectedCategory, searchQuery]);

  const resetFilters = () => {
    setSelectedProject(undefined);
    setSelectedSupplier(undefined);
    setSelectedCategory(undefined);
    setSearchQuery('');
  }

  const hasActiveFilters = selectedProject || selectedSupplier || selectedCategory || searchQuery;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-headline">Gestión de Gastos</h1>
          <p className="mt-1 text-muted-foreground">
            Registre y consulte todos los gastos asociados a las obras.
          </p>
        </div>
        {permissions.canLoadExpenses && <AddExpenseDialog />}
      </div>
      
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <h3 className="font-semibold tracking-tight">Filtros</h3>
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Input 
                placeholder="Buscar por descripción, n°..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="xl:col-span-2"
            />
            <Select onValueChange={(value) => setSelectedProject(value === 'all' ? undefined : value)} value={selectedProject}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Obra" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las Obras</SelectItem>
                    {isLoadingProjects ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                        projects?.map((p: Project) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedSupplier(value === 'all' ? undefined : value)} value={selectedSupplier}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Proveedor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Proveedores</SelectItem>
                     {isLoadingSuppliers ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                        Object.entries(suppliersMap).map(([id, name]) => (
                            <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)} value={selectedCategory}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Rubro" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Rubros</SelectItem>
                    {expenseCategories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
         {hasActiveFilters && (
            <Button variant="ghost" onClick={resetFilters} className="w-fit self-start">
                <X className="mr-2 h-4 w-4" />
                Limpiar Filtros
            </Button>
        )}
      </div>

      <ExpensesTable 
        expenses={displayedExpenses}
        isLoading={isLoading}
        projectsMap={projectsMap}
        suppliersMap={suppliersMap}
      />
    </div>
  );
}
