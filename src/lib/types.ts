export type Role = "Dirección" | "Supervisor" | "Administración" | "Operador" | "Pañolero";

export type Permissions = {
  isSuperAdmin: boolean;
  canValidate: boolean;
  canLoadExpenses: boolean;
  canManageProjects: boolean;
  canSupervise: boolean;
  canManageStock: boolean;
  canManageSales: boolean;
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
  projectMode?: 'CLIENT' | 'INVESTMENT';
  investmentData?: {
    landCost: number;        // Costo del Terreno (USD)
    totalArea: number;       // Metros Cuadrados Vendibles
    unitsCount?: number;     // Cantidad de Unidades Funcionales
    projectedSalePrice: number; // Precio de Venta Total Estimado (USD)
  };
}

export interface Expense {
  id: string;
  projectId: string;
  date: string;
  supplierId: string;
  categoryId: string;
  documentType: 'Factura' | 'Recibo Común' | 'Nota de Crédito';
  invoiceNumber?: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  amount: number;
  paidAmount?: number;
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
  status: 'Pendiente de Pago' | 'Programado' | 'Pagado';
  paidDate?: string;
  treasuryAccountId?: string;
  paymentSource?: 'Tesorería' | 'Caja Chica';
  payrollWeekId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  alias?: string;
  cuit: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  status: 'Aprobado' | 'Pendiente' | 'Rechazado';
  type: 'Servicios' | 'Materiales' | 'Mixto';
  fiscalCondition?: string;
  notes?: string;
  insuranceExpiryDate?: string; // YYYY-MM-DD
  artExpiryDate?: string; // YYYY-MM-DD
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
  budgets?: { [projectId: string]: { initial?: number; additionals?: { amount: number; description: string }[] } };
}

export interface DocumentRecord {
  id: string;
  type: string;
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface ContractorEmployee {
  id: string;
  name: string;
  contractorId: string;
  artExpiryDate?: string;
  documents?: DocumentRecord[];
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'Activo' | 'Inactivo';
  paymentType: 'Diario' | 'Semanal';
  category: string;
  dailyWage: number;
  artExpiryDate?: string;
  documents?: DocumentRecord[];
}

export interface DailyWageHistory {
  id: string;
  amount: number;
  effectiveDate: string;
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
  lastClosureDate?: string;
  lastClosureAmount?: number;
}

export interface CashClosure {
  id: string;
  cashAccountId: string;
  date: string;
  amount: number;
  notes?: string;
  userId: string;
  createdAt: string;
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
  isInternalLoan?: boolean;
  loanStatus?: 'Pendiente' | 'Saldado';
  transferId?: string;
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
  status: 'Pendiente' | 'Aprobado' | 'Pagado' | 'Rechazado' | 'Aplazado';
  description?: string;
  source?: 'MANUAL' | 'IMPORT' | 'IMPORT_LEGACY';
}

export interface PayrollWeek {
  id: string;
  startDate: string;
  endDate: string;
  exchangeRate?: number;
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
  installments?: number; // Total number of installments
  createdAt?: string; // ISO Date of creation for sorting/tracking
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: 'presente' | 'ausente';
  lateHours: number;
  notes: string;
  projectId?: string | null;
  payrollWeekId: string;
  source?: 'MANUAL' | 'IMPORT' | 'IMPORT_LEGACY';
  reason?: 'Vacaciones' | 'Enfermedad' | 'Falta Injustificada' | 'Licencia' | 'Otro';
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
  isUrgent?: boolean;
  urgentAt?: string;
}

export interface TechnicalOfficeEmployee {
  id: string;
  userId: string;
  fullName: string;
  position: string;
  employmentType: 'Relación de Dependencia' | 'Monotributo';
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

export interface MonthlySalary {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // YYYY-MM
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'Pendiente de Pago' | 'Pagado';
  paidDate?: string;
  treasuryAccountId?: string;
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

export interface Sale {
  id: string;
  projectId: string;
  date: string;
  description: string;
  documentType: 'Factura de Venta' | 'Nota de Crédito';
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
  status: 'Borrador' | 'Pendiente de Cobro' | 'Cobrado' | 'Cancelado';
  invoiceUrl?: string;
  collectedDate?: string;
  treasuryAccountId?: string;
  retencionGanancias?: number;
  retencionIVA?: number;
  retencionIIBB?: number;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: 'ARS' | 'USD';
  period: 'Diario' | 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';
  paymentSource: 'Tesorería' | 'Caja Chica';
  issueDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  status: 'Activo' | 'Pausado';
  notes?: string;
}

export interface Moratoria {
  id: string;
  name: string;
  tax: string;
  totalAmount: number;
  paidAmount: number;
  installments: number;
  paidInstallments: number;
  installmentAmount: number;
  nextDueDate: string; // YYYY-MM-DD
  status: 'Activa' | 'Finalizada' | 'Incumplida';
}



export interface ContractorCertification {
  id: string;
  payrollWeekId: string;
  contractorId: string;
  contractorName: string;
  projectId: string;
  projectName: string;
  amount: number;
  currency: 'ARS' | 'USD';
  date: string; // YYYY-MM-DD
  notes?: string;
  status: 'Pendiente' | 'Aprobado' | 'Pagado' | 'Rechazado';
  requesterId: string;
  requesterName: string;
  relatedExpenseId?: string;
  source?: 'MANUAL' | 'IMPORT' | 'IMPORT_LEGACY';
}

export interface ClientFollowUp {
  id: string;
  clientName: string;
  contactPerson?: string;
  contactDate: string;
  channel: 'Llamada' | 'Email' | 'Reunión' | 'WhatsApp' | 'Otro';
  status: 'Primer Contacto' | 'En Seguimiento' | 'Propuesta Enviada' | 'En Negociación' | 'Cerrado - Ganado' | 'Cerrado - Perdido' | 'Stand-by';
  summary: string;
  nextStep?: string;
  nextContactDate?: string;
  assignedTo: string;
  assignedToName: string;
}

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

export interface ProjectPhase {
  id: string; // UUID
  projectId: string;
  name: string; // e.g., "Anteproyecto", "Licitación", "Ejecución", "Finalización"
  order: number;
  startDate?: string; // ISO Date
  endDate?: string; // ISO Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  phaseId?: string; // Optional link to a specific phase
  date: string; // ISO Timestamp
  author: string; // User Name
  content: string; // Markdown or Text
  type: 'NOTE' | 'MEETING' | 'DECISION' | 'ISSUE' | 'PROGRESS';
  attachments?: string[]; // URLs to Drive/Storage
}

// --- STOCK & PAÑOL ---

export type ItemCategory = 'Power Tools' | 'Hand Tools' | 'Safety' | 'Consumables' | 'Machinery' | 'Other';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  type: 'TOOL' | 'CONSUMABLE';
  sku?: string; // Barcode / QR
  minStock: number; // Alert threshold
  location?: string; // Shelf/Bin
  image?: string; // URL
  lastUpdated?: string; // ISO Date
  description?: string;
}

export interface Tool extends InventoryItem {
  type: 'TOOL';
  status: 'AVAILABLE' | 'IN_USE' | 'BROKEN' | 'IN_REPAIR' | 'STOLEN' | 'LOST' | 'DISCARDED';
  currentHolder?: {
    type: 'EMPLOYEE' | 'PROJECT';
    id: string;
    name: string;
  } | null;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: 'ARS' | 'USD';
  lifespanMonths?: number;
  serialNumber?: string;
  brand?: string;
  model?: string;
}

export interface Consumable extends InventoryItem {
  type: 'CONSUMABLE';
  quantity: number;
  unit: string; // "units", "meters", "boxes", "kg"
  avgCost?: number; // Weighted Average Cost
}

export type MovementType = 'CHECK_OUT' | 'CHECK_IN' | 'PURCHASE' | 'ADJUSTMENT' | 'LOSS' | 'BROKEN' | 'REPAIR_START' | 'REPAIR_END' | 'STOLEN';

export type StockItem = Tool | Consumable;

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'TOOL' | 'CONSUMABLE';
  date: string; // ISO
  type: MovementType;
  quantity: number; // 1 for tools usually

  from?: {
    type: 'WAREHOUSE' | 'PROJECT' | 'EMPLOYEE';
    id: string;
    name: string;
  };

  to?: {
    type: 'WAREHOUSE' | 'PROJECT' | 'EMPLOYEE';
    id: string;
    name: string;
  };

  projectId?: string;
  projectName?: string;

  authorizedBy: string; // User ID
  authorizedByName?: string;
  notes?: string;
  batchId?: string; // To group movements (e.g. multiple items in one checkout)
  unitCost?: number; // Snapshot of cost at time of movement
  totalCost?: number; // quantity * unitCost
}
