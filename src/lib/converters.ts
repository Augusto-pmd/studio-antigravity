'use client';

import {
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import type {
  Project,
  Expense,
  Supplier,
  Contractor,
  ContractorEmployee,
  Employee,
  DailyWageHistory,
  Asset,
  CashAccount,
  CashTransaction,
  FundRequest,
  PayrollWeek,
  CashAdvance,
  Attendance,
  TaskRequest,
  TechnicalOfficeEmployee,
  TimeLog,
  SalaryHistory,
  MonthlySalary,
  TreasuryAccount,
  TreasuryTransaction,
  Sale,
  RecurringExpense,
  Moratoria,
  StockItem,
  StockMovement,
  ContractorCertification,
  ClientFollowUp,
  UserProfile,
  Role,
} from './types';

// Utility to safely parse numbers that might be strings or undefined
export const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleanedString = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedString);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// --- Main Entity Converters ---

export const projectConverter = {
  toFirestore: (data: Project): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      budget: parseNumber(data.budget),
      balance: parseNumber(data.balance),
      progress: parseNumber(data.progress),
    } as Project;
  },
};

export const expenseConverter = {
  toFirestore: (data: Expense): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      amount: parseNumber(data.amount),
      paidAmount: parseNumber(data.paidAmount),
      iva: parseNumber(data.iva),
      iibb: parseNumber(data.iibb),
      exchangeRate: parseNumber(data.exchangeRate),
      retencionGanancias: parseNumber(data.retencionGanancias),
      retencionIVA: parseNumber(data.retencionIVA),
      retencionIIBB: parseNumber(data.retencionIIBB),
      retencionSUSS: parseNumber(data.retencionSUSS),
      status: data.status,
      paymentDueDate: data.paymentDueDate,
      paymentSource: data.paymentSource,
    } as Expense;
  },
};

export const supplierConverter = {
    toFirestore: (data: Supplier): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Supplier => ({ ...snapshot.data(), id: snapshot.id } as Supplier)
};

export const employeeConverter = {
  toFirestore: (data: Employee): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      dailyWage: parseNumber(data.dailyWage),
    } as Employee;
  },
};

export const dailyWageHistoryConverter = {
    toFirestore: (data: DailyWageHistory): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): DailyWageHistory & { employeeId: string } => {
        const data = snapshot.data(options)!;
        const employeeId = snapshot.ref.parent.parent!.id;
        return {
            id: snapshot.id,
            employeeId,
            amount: parseNumber(data.amount),
            effectiveDate: data.effectiveDate,
        } as DailyWageHistory & { employeeId: string };
    }
};

export const attendanceConverter = {
  toFirestore: (data: Attendance): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Attendance => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      lateHours: parseNumber(data.lateHours),
    } as Attendance;
  },
};

export const cashAdvanceConverter = {
  toFirestore: (data: CashAdvance): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAdvance => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      amount: parseNumber(data.amount),
    } as CashAdvance;
  },
};

export const fundRequestConverter = {
  toFirestore: (data: FundRequest): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      amount: parseNumber(data.amount),
      exchangeRate: parseNumber(data.exchangeRate || 1),
    } as FundRequest;
  },
};

export const certificationConverter = {
  toFirestore: (data: ContractorCertification): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorCertification => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      amount: parseNumber(data.amount),
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      relatedExpenseId: data.relatedExpenseId,
    } as ContractorCertification;
  },
};

export const payrollWeekConverter = {
    toFirestore: (data: PayrollWeek): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PayrollWeek => {
        const data = snapshot.data(options)!;
        return { 
            ...data, 
            id: snapshot.id,
            exchangeRate: parseNumber(data.exchangeRate || 1)
        } as PayrollWeek;
    }
};

export const techOfficeEmployeeConverter = {
    toFirestore: (data: TechnicalOfficeEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TechnicalOfficeEmployee => {
        const data = snapshot.data()!;
        return { 
            ...data,
            id: snapshot.id,
            monthlySalary: parseNumber(data.monthlySalary)
        } as TechnicalOfficeEmployee
    }
};

export const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => {
        const data = snapshot.data()!;
        let dateStr: string = '';
        if (data.date) {
            if ((data.date as Timestamp)?.toDate && typeof (data.date as Timestamp).toDate === 'function') {
                dateStr = format((data.date as Timestamp).toDate(), 'yyyy-MM-dd');
            } 
            else if (typeof data.date === 'string') {
                dateStr = data.date.split('T')[0];
            }
        }
        return { 
            ...data, 
            id: snapshot.id,
            date: dateStr,
            hours: parseNumber(data.hours)
        } as TimeLog;
    }
};

export const userProfileConverter = {
    toFirestore: (profile: UserProfile): DocumentData => {
        const { id, ...data } = profile;
        return data;
    },
    fromFirestore: (snapshot: DocumentSnapshot, options: SnapshotOptions): UserProfile => {
        const data = snapshot.data()!;
        return {
            id: snapshot.id,
            role: data.role as Role,
            fullName: data.fullName,
            email: data.email,
            photoURL: data.photoURL,
        };
    }
};

export const cashAccountConverter = {
    toFirestore: (data: CashAccount): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashAccount => {
      const data = snapshot.data()!;
      return {
        ...data,
        id: snapshot.id,
        balance: parseNumber(data.balance)
      } as CashAccount;
    }
};

export const cashTransactionConverter = {
    toFirestore: (data: CashTransaction): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CashTransaction => {
      const data = snapshot.data()!;
      return {
        ...data,
        id: snapshot.id,
        amount: parseNumber(data.amount)
      } as CashTransaction;
    }
};

export const saleConverter = {
    toFirestore: (data: Sale): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Sale => {
        const data = snapshot.data()!;
        return {
            ...data,
            id: snapshot.id,
            netAmount: parseNumber(data.netAmount),
            ivaAmount: parseNumber(data.ivaAmount),
            totalAmount: parseNumber(data.totalAmount),
            retencionGanancias: parseNumber(data.retencionGanancias),
            retencionIVA: parseNumber(data.retencionIVA),
            retencionIIBB: parseNumber(data.retencionIIBB),
        } as Sale;
    }
};

export const assetConverter = {
    toFirestore: (data: Asset): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Asset => {
        const data = snapshot.data()!;
        return {
            ...data,
            id: snapshot.id,
            purchaseValue: parseNumber(data.purchaseValue),
        } as Asset;
    }
};

export const contractorConverter = {
    toFirestore: (data: Contractor): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contractor => {
        const data = snapshot.data()!;
        const budgets = data.budgets || {};
        for(const projectId in budgets) {
            budgets[projectId].initial = parseNumber(budgets[projectId].initial);
            if (budgets[projectId].additionals) {
                 budgets[projectId].additionals.forEach((ad: any) => {
                    ad.amount = parseNumber(ad.amount);
                });
            }
        }
        return { ...data, id: snapshot.id, budgets } as Contractor;
    }
};

export const contractorEmployeeConverter = {
    toFirestore: (data: ContractorEmployee): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ContractorEmployee => {
        const data = snapshot.data()!;
        return {
            id: snapshot.id,
            name: data.name,
            contractorId: data.contractorId,
            artExpiryDate: data.artExpiryDate,
            documents: data.documents || [],
        } as ContractorEmployee
    }
};

export const monthlySalaryConverter = {
  toFirestore: (data: MonthlySalary): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): MonthlySalary => {
    const data = snapshot.data()!;
    return {
      ...data,
      id: snapshot.id,
      grossSalary: parseNumber(data.grossSalary),
      deductions: parseNumber(data.deductions),
      netSalary: parseNumber(data.netSalary),
    } as MonthlySalary
  }
};

export const moratoriaConverter = {
    toFirestore: (data: Moratoria): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Moratoria => {
      const data = snapshot.data()!;
      return {
        ...data,
        id: snapshot.id,
        totalAmount: parseNumber(data.totalAmount),
        paidAmount: parseNumber(data.paidAmount),
        installments: parseNumber(data.installments),
        paidInstallments: parseNumber(data.paidInstallments),
        installmentAmount: parseNumber(data.installmentAmount),
      } as Moratoria;
    }
};

export const recurringExpenseConverter = {
    toFirestore: (data: RecurringExpense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RecurringExpense => {
        const data = snapshot.data()!;
        return {
            ...data,
            id: snapshot.id,
            amount: parseNumber(data.amount),
        } as RecurringExpense;
    }
};

export const stockItemConverter = {
    toFirestore: (data: StockItem): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StockItem => {
        const data = snapshot.data()!;
        return {
            ...data,
            id: snapshot.id,
            quantity: parseNumber(data.quantity),
            reorderPoint: parseNumber(data.reorderPoint),
        } as StockItem;
    }
};

export const stockMovementConverter = {
    toFirestore: (data: StockMovement): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StockMovement => {
        const data = snapshot.data()!;
        return {
            ...data,
            id: snapshot.id,
            quantity: parseNumber(data.quantity),
        } as StockMovement;
    }
};

export const taskRequestConverter = {
    toFirestore: (data: TaskRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TaskRequest => {
        const data = snapshot.data()!;
        return { ...data, id: snapshot.id } as TaskRequest
    }
};

export const treasuryAccountConverter = {
    toFirestore: (data: TreasuryAccount): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryAccount => {
      const data = snapshot.data()!;
      return {
        ...data,
        id: snapshot.id,
        balance: parseNumber(data.balance)
      } as TreasuryAccount;
    }
};

export const treasuryTransactionConverter = {
    toFirestore: (data: TreasuryTransaction): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TreasuryTransaction => {
      const data = snapshot.data()!;
      return {
        ...data,
        id: snapshot.id,
        amount: parseNumber(data.amount)
      } as TreasuryTransaction;
    }
};

export const clientFollowUpConverter = {
  toFirestore: (data: ClientFollowUp): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ClientFollowUp => {
    const data = snapshot.data()!;
    return { ...data, id: snapshot.id } as ClientFollowUp
  }
};
