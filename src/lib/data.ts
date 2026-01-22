import type { Project, Supplier, ExpenseCategory } from '@/lib/types';

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
    { month: 'Ene', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Feb', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Mar', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Abr', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'May', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Jun', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Jul', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Ago', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Sep', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Oct', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Nov', total: Math.floor(Math.random() * 5000) + 1000 },
    { month: 'Dic', total: Math.floor(Math.random() * 5000) + 1000 },
];
