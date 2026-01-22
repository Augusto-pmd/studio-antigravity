export type Project = {
  id: string;
  name: string;
  client: string;
  address: string;
  currency: 'ARS' | 'USD';
  projectType: string;
  status: 'En Curso' | 'Completado' | 'Pausado' | 'Cancelado';
  startDate?: string;
  endDate?: string;
  supervisor: string;
  budget: number;
  balance: number;
  progress: number;
  description?: string;
};

export type Supplier = {
  id: string;
  name: string;
  cuit: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  status: 'Aprobado' | 'Pendiente' | 'Rechazado';
  type: 'Servicios' | 'Materiales' | 'Mixto';
  fiscalCondition?: string;
  notes?: string;
};

export type Contractor = {
  id: string;
  name: string;
  cuit: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  status: 'Aprobado' | 'Pendiente' | 'Rechazado';
  fiscalCondition?: string;
  notes?: string;
  insuranceExpiryDate?: string;
  artExpiryDate?: string;
};

export type ContractorEmployee = {
  id: string;
  name: string;
  contractorId: string;
  artExpiryDate?: string;
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

export type UserProfile = {
  id: string;
  role: Role;
  email: string;
  fullName: string;
};

export type TaskRequest = {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  assigneeId: string;
  assigneeName: string;
  status: 'Pendiente' | 'Finalizado';
  createdAt: string;
  completedAt?: string;
  projectId?: string;
};

export type Expense = {
  id: string;
  projectId: string;
  date: string;
  supplierId: string;
  categoryId: string;
  documentType: 'Factura' | 'Recibo Común';
  invoiceNumber?: string;
  paymentMethod?: string;
  amount: number;
  iva?: number;
  iibb?: number;
  iibbJurisdiction?: 'No Aplica' | 'CABA' | 'Provincia';
  currency: 'ARS' | 'USD';
  exchangeRate: number;
  receiptUrl?: string;
};

    