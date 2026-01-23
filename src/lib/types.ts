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
  photoURL?: string;
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
  retencionGanancias?: number;
  retencionIVA?: number;
  retencionIIBB?: number;
  retencionSUSS?: number;
};

export type Asset = {
  id: string;
  name: string;
  description?: string;
  purchaseDate: string;
  purchaseValue: number;
  currency: 'ARS' | 'USD';
  category: string;
  status: 'Activo' | 'Mantenimiento' | 'Vendido' | 'De Baja';
};

export type FundRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  date: string;
  category: 'Logística y PMD' | 'Materiales' | 'Viáticos' | 'Caja Chica' | 'Otros';
  projectId?: string;
  projectName?: string; // Denormalized for display
  amount: number;
  currency: 'ARS' | 'USD';
  exchangeRate: number;
  status: 'Pendiente' | 'Aprobado' | 'Pagado' | 'Rechazado';
};

export type PayrollWeek = {
  id: string;
  startDate: string;
  endDate: string;
  status: 'Abierta' | 'Cerrada';
  generatedAt: string;
};

export type CashAdvance = {
  id: string;
  employeeId: string;
  employeeName: string; // denormalized for display
  projectId?: string;
  projectName?: string; // denormalized for display
  date: string;
  amount: number;
  reason?: string;
  payrollWeekId: string; // To associate with a payment week
};

export type CashAccount = {
  id: string;
  userId: string;
  name: string; // e.g., 'Caja Principal ARS'
  currency: 'ARS';
  balance: number;
};

export type CashTransaction = {
  id: string;
  userId: string;
  date: string;
  type: 'Ingreso' | 'Egreso' | 'Refuerzo' | 'Transferencia';
  amount: number;
  currency: 'ARS';
  description: string;
  relatedExpenseId?: string;
  relatedProjectId?: string;
  relatedProjectName?: string; // Denormalized
  operatorId?: string; // User who performed the action, if not the account owner (e.g. admin)
  operatorName?: string; // Denormalized
};

export type TechnicalOfficeEmployee = {
  id: string; // Corresponds to the User ID (auth.uid)
  userId: string;
  fullName: string;
  position: string; // e.g., "Arquitecto Proyectista", "Jefe de Compras"
  monthlySalary: number;
  status: 'Activo' | 'Inactivo';
};

export type TimeLog = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  projectId: string;
  hours: number;
  description?: string;
};
