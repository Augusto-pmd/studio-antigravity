export type Role = "Dirección" | "Supervisor" | "Administración" | "Operador";

export type Permissions = {
  isSuperAdmin: boolean;
  canValidate: boolean;
  canLoadExpenses: boolean;
  canManageProjects: boolean;
};

export type UserProfile = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  photoURL?: string;
};

export interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
  currency: 'ARS' | 'USD';
  projectType?: string;
  status: 'En Curso' | 'Completado' | 'Pausado' | 'Cancelado';
  startDate?: string;
  endDate?: string;
  supervisor: string;
  budget: number;
  balance: number;
  progress: number;
  description?: string;
}

export interface Expense {
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
  description?: string;
  retencionGanancias?: number;
  retencionIVA?: number;
  retencionIIBB?: number;
  retencionSUSS?: number;
}

export interface Supplier {
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
}

export interface Contractor {
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
}

export interface ContractorEmployee {
    id: string;
    name: string;
    contractorId: string;
    artExpiryDate?: string;
}

export interface Employee {
    id: string;
    name: string;
    status: 'Activo' | 'Inactivo';
    paymentType: 'Diario' | 'Semanal';
    category: string;
    dailyWage: number;
    artExpiryDate?: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  purchaseDate: string;
  purchaseValue: number;
  currency: 'ARS' | 'USD';
  category: string;
  status: 'Activo' | 'Mantenimiento' | 'Vendido' | 'De Baja';
}

export interface CashAccount {
  id: string;
  userId: string;
  name: string;
  currency: 'ARS';
  balance: number;
}

export interface CashTransaction {
    id: string;
    userId: string;
    date: string;
    type: 'Ingreso' | 'Egreso' | 'Refuerzo' | 'Transferencia';
    amount: number;
    currency: 'ARS';
    description: string;
    relatedExpenseId?: string;
    relatedProjectId?: string;
    relatedProjectName?: string;
    operatorId?: string;
    operatorName?: string;
}

export interface FundRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    date: string;
    category: 'Logística y PMD' | 'Materiales' | 'Viáticos' | 'Caja Chica' | 'Otros';
    projectId?: string;
    projectName?: string;
    amount: number;
    currency: 'ARS' | 'USD';
    exchangeRate: number;
    status: 'Pendiente' | 'Aprobado' | 'Pagado' | 'Rechazado';
}

export interface PayrollWeek {
    id: string;
    startDate: string;
    endDate: string;
    status: 'Abierta' | 'Cerrada';
    generatedAt: string;
}

export interface CashAdvance {
    id: string;
    employeeId: string;
    employeeName: string;
    projectId?: string;
    projectName?: string;
    date: string;
    amount: number;
    reason?: string;
    payrollWeekId: string;
}

export interface TaskRequest {
    id: string;
    title: string;
    description?: string;
    requesterId: string;
    requesterName: string;
    assigneeId: string;
    assigneeName: string;
    status: 'Pendiente' | 'Finalizado';
    createdAt: string;
    completedAt?: string;
    projectId?: string;
}

export interface TechnicalOfficeEmployee {
    id: string;
    userId: string;
    fullName: string;
    position: string;
    monthlySalary: number;
    status: 'Activo' | 'Inactivo';
}

export interface TimeLog {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    projectId: string;
    hours: number;
    description?: string;
}

export interface SalaryHistory {
    id: string;
    amount: number;
    effectiveDate: string;
}

export interface TreasuryAccount {
    id: string;
    name: string;
    currency: 'ARS' | 'USD';
    balance: number;
    accountType: 'Banco' | 'Efectivo';
    cbu?: string;
}

export interface TreasuryTransaction {
    id: string;
    treasuryAccountId: string;
    date: string;
    type: 'Ingreso' | 'Egreso';
    amount: number;
    currency: 'ARS' | 'USD';
    description: string;
    category: string;
    relatedDocumentId?: string;
    relatedDocumentType?: string;
    projectId?: string;
    projectName?: string;
}
