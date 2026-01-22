import type { Project, Supplier, ExpenseCategory, Employee } from '@/lib/types';

export const projects: Project[] = [
  { id: 'PROJ-001', name: 'Edificio Corporativo Central', status: 'En Curso', balance: 500000, progress: 75, supervisor: 'Juan Pérez' },
  { id: 'PROJ-002', name: 'Residencial Los Robles', status: 'Completado', balance: 0, progress: 100, supervisor: 'Maria González' },
  { id: 'PROJ-003', name: 'Centro Comercial del Sol', status: 'Pausado', balance: 120000, progress: 40, supervisor: 'Juan Pérez' },
  { id: 'PROJ-004', name: 'Remodelación Oficinas PMD', status: 'En Curso', balance: 25000, progress: 90, supervisor: 'Carlos Lopez' },
  { id: 'PROJ-005', name: 'Parque Industrial Norte', status: 'En Curso', balance: 850000, progress: 20, supervisor: 'Maria González' },
  { id: 'PROJ-006', name: 'Viviendas Sociales "El Futuro"', status: 'Cancelado', balance: 10000, progress: 10, supervisor: 'Carlos Lopez' },
];

export const suppliers: Supplier[] = [
  { id: 'SUP-01', name: 'Materiales Construcción S.A.' },
  { id: 'SUP-02', name: 'Ferretería El Tornillo Feliz' },
  { id: 'SUP-03', name: 'Proveedor Vencido ART' },
  { id: 'SUP-04', name: 'Servicios Eléctricos Lux' },
  { id: 'SUP-05', name: 'Hormigones del Sur' },
];

export const expenseCategories: ExpenseCategory[] = [
  { id: 'CAT-01', name: 'Materiales' },
  { id: 'CAT-02', name: 'Mano de Obra' },
  { id: 'CAT-03', 'name': 'Herramientas y Equipos' },
  { id: 'CAT-04', name: 'Transporte y Logística' },
  { id: 'CAT-05', name: 'Varios y Administrativos' },
];

export const monthlyExpenses = [
    { month: 'Ene', total: 1850 },
    { month: 'Feb', total: 2200 },
    { month: 'Mar', total: 1900 },
    { month: 'Abr', total: 2780 },
    { month: 'May', total: 1890 },
    { month: 'Jun', total: 2390 },
    { month: 'Jul', total: 3490 },
    { month: 'Ago', total: 2100 },
    { month: 'Sep', total: 2900 },
    { month: 'Oct', total: 3100 },
    { month: 'Nov', total: 2500 },
    { month: 'Dic', total: 2800 },
];

export const employees: Employee[] = [
  { id: 'EMP-001', name: 'Carlos Rodríguez', projectId: 'PROJ-001', status: 'Activo', paymentType: 'Semanal' },
  { id: 'EMP-002', name: 'Ana Lopez', projectId: 'PROJ-001', status: 'Activo', paymentType: 'Diario' },
  { id: 'EMP-003', name: 'Luis Martinez', projectId: 'PROJ-001', status: 'Inactivo', paymentType: 'Semanal' },
  { id: 'EMP-004', name: 'Laura Sanchez', projectId: 'PROJ-004', status: 'Activo', paymentType: 'Semanal' },
  { id: 'EMP-005', name: 'Javier Gomez', projectId: 'PROJ-004', status: 'Activo', paymentType: 'Diario' },
  { id: 'EMP-006', name: 'Sofia Diaz', projectId: 'PROJ-005', status: 'Activo', paymentType: 'Semanal' },
  { id: 'EMP-007', name: 'Diego Fernandez', projectId: 'PROJ-005', status: 'Activo', paymentType: 'Semanal' },
];
