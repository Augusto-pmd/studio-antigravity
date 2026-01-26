'use client';

import { useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Expense, Sale } from '@/lib/types';
import { useMemo } from 'react';
import { IvaSummary } from './iva-summary';
import { IibbSummary } from './iibb-summary';
import { ExpenseReport } from './expense-report';
import { Skeleton } from '../ui/skeleton';
import { RetencionesSummary } from './retenciones-summary';
import { AccountsPayable } from './accounts-payable';
import { AccountsReceivable } from './accounts-receivable';

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

const saleConverter = {
    toFirestore: (data: Sale): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Sale => ({ ...snapshot.data(options), id: snapshot.id } as Sale)
};

export function AccountingDashboard() {
  const firestore = useFirestore();

  const expensesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null),
    [firestore]
  );
  const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const salesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'sales').withConverter(saleConverter)) : null),
    [firestore]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  
  const formalExpenses = useMemo(() => {
    if (!allExpenses) return [];
    // Exclude expenses paid with "Efectivo" from formal accounting
    return allExpenses.filter(e => e.paymentMethod !== 'Efectivo');
  }, [allExpenses]);


  const { ivaCredit, ivaDebit, iibbCABA, iibbProvincia, retGanancias, retIva, retIibb, retSuss } = useMemo(() => {
    if (!formalExpenses || !sales) {
      return { ivaCredit: 0, ivaDebit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 };
    }
    
    const expenseSummary = formalExpenses.reduce(
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
    
    const ivaDebit = sales.reduce((acc, sale) => {
      if (!['Cancelado', 'Borrador'].includes(sale.status)) {
        return acc + (sale.ivaAmount || 0);
      }
      return acc;
    }, 0);

    return { ...expenseSummary, ivaDebit };

  }, [formalExpenses, sales]);
  

  if (isLoadingExpenses || isLoadingSales) {
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccountsPayable />
        <AccountsReceivable />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <IvaSummary ivaCredit={ivaCredit} ivaDebit={ivaDebit} />
        <IibbSummary iibbCABA={iibbCABA} iibbProvincia={iibbProvincia} />
      </div>
      <RetencionesSummary retGanancias={retGanancias} retIva={retIva} retIibb={retIibb} retSuss={retSuss} />
      <ExpenseReport expenses={formalExpenses || []} isLoading={isLoadingExpenses} />
    </div>
  );
}
