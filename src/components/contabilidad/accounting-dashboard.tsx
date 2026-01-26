'use client';

import { useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Expense } from '@/lib/types';
import { useMemo } from 'react';
import { IvaSummary } from './iva-summary';
import { IibbSummary } from './iibb-summary';
import { ExpenseReport } from './expense-report';
import { Skeleton } from '../ui/skeleton';
import { RetencionesSummary } from './retenciones-summary';
import { BankStatementAnalyzer } from './bank-statement-analyzer';

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '$0';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export function AccountingDashboard() {
  const firestore = useFirestore();

  const expensesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null),
    [firestore]
  );
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const { ivaCredit, iibbCABA, iibbProvincia, retGanancias, retIva, retIibb, retSuss } = useMemo(() => {
    if (!expenses) {
      return { ivaCredit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 };
    }
    return expenses.reduce(
      (acc, expense) => {
        acc.ivaCredit += expense.iva || 0;
        if (expense.iibbJurisdiction === 'CABA') {
          acc.iibbCABA += expense.iibb || 0;
        } else if (expense.iibbJurisdiction === 'Provincia') {
          acc.iibbProvincia += expense.iibb || 0;
        }
        acc.retGanancias += expense.retencionGanancias || 0;
        acc.retIva += expense.retencionIVA || 0;
        acc.retIibb += expense.retencionIIBB || 0;
        acc.retSuss += expense.retencionSUSS || 0;
        return acc;
      },
      { ivaCredit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 }
    );
  }, [expenses]);
  
  const currentContextForAI = useMemo(() => {
    return `
      - Crédito Fiscal IVA actual: ${formatCurrency(ivaCredit)}.
      - Percepciones IIBB CABA: ${formatCurrency(iibbCABA)}.
      - Percepciones IIBB Provincia: ${formatCurrency(iibbProvincia)}.
      - Retenciones (Ganancias: ${formatCurrency(retGanancias)}, IVA: ${formatCurrency(retIva)}, IIBB: ${formatCurrency(retIibb)}, SUSS: ${formatCurrency(retSuss)}).
      - Total de gastos registrados: ${expenses?.length || 0}.
    `;
  }, [expenses, ivaCredit, iibbCABA, iibbProvincia, retGanancias, retIva, retIibb, retSuss]);


  if (isLoadingExpenses) {
    return (
        <div className='space-y-6'>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
            </div>
             <Skeleton className="h-48" />
            <Skeleton className="h-80" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <BankStatementAnalyzer currentContext={currentContextForAI} />
      <div className="grid gap-6 md:grid-cols-2">
        <IvaSummary ivaCredit={ivaCredit} />
        <IibbSummary iibbCABA={iibbCABA} iibbProvincia={iibbProvincia} />
      </div>
      <RetencionesSummary retGanancias={retGanancias} retIva={retIva} retIibb={retIibb} retSuss={retSuss} />
      <ExpenseReport expenses={expenses || []} isLoading={isLoadingExpenses} />
    </div>
  );
}
