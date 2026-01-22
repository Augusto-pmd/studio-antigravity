export type Project = {
  id: string;
  name: string;
  client: string;
  address: string;
  currency: 'ARS' | 'USD';
  projectType: string;
  status: 'En Curso' | 'Completado' | 'Pausado' | 'Cancelado';
  startDate: string;
  endDate?: string;
  supervisor: string;
  budget: number;
  balance: number;
  progress: number;
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
  status: 'Activo' | 'Inactivo';
  paymentType: 'Diario' | 'Semanal';
  category: string;
  dailyWage: number;
  artExpiryDate?: string;
};

    
