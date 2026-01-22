export type Project = {
  id: string;
  name: string;
  status: 'En Curso' | 'Completado' | 'Pausado' | 'Cancelado';
  balance: number;
  progress: number;
  supervisor: string;
};

export type Supplier = {
  id: string;
  name: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
};

export type Role = 'Dirección' | 'Supervisor' | 'Administración' | 'Operador';

export type Employee = {
  id: string;
  name: string;
  projectId: string;
  status: 'Activo' | 'Inactivo';
  paymentType: 'Diario' | 'Semanal';
};
