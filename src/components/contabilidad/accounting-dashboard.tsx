'use client';

import { useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collectionGroup, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { Expense, Contract } from '@/lib/types';
import { useMemo } from 'react';
import { IvaSummary } from './iva-summary';
import { IibbSummary } from './iibb-summary';
import { ExpenseReport } from './expense-report';
import { Skeleton } from '../ui/skeleton';
import { RetencionesSummary } from './retenciones-summary';

const expenseConverter = {
    toFirestore: (data: Expense): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense)
};

const contractConverter = {
    toFirestore: (data: Contract): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contract => ({ ...snapshot.data(options), id: snapshot.id } as Contract)
};

export function AccountingDashboard() {
  const firestore = useFirestore();

  const expensesQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter)) : null),
    [firestore]
  );
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const contractsQuery = useMemo(
    () => (firestore ? query(collectionGroup(firestore, 'contracts').withConverter(contractConverter)) : null),
    [firestore]
  );
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<Contract>(contractsQuery);

  const { ivaCredit, ivaDebit, iibbCABA, iibbProvincia, retGanancias, retIva, retIibb, retSuss } = useMemo(() => {
    if (!expenses || !contracts) {
      return { ivaCredit: 0, ivaDebit: 0, iibbCABA: 0, iibbProvincia: 0, retGanancias: 0, retIva: 0, retIibb: 0, retSuss: 0 };
    }
    
    const expenseSummary = expenses.reduce(
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
    
    const ivaDebit = contracts.reduce((acc, contract) => {
      if (contract.status !== 'Cancelado') {
        return acc + (contract.ivaAmount || 0);
      }
      return acc;
    }, 0);

    return { ...expenseSummary, ivaDebit };

  }, [expenses, contracts]);
  

  if (isLoadingExpenses || isLoadingContracts) {
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
      <div className="grid gap-6 md:grid-cols-2">
        <IvaSummary ivaCredit={ivaCredit} ivaDebit={ivaDebit} />
        <IibbSummary iibbCABA={iibbCABA} iibbProvincia={iibbProvincia} />
      </div>
      <RetencionesSummary retGanancias={retGanancias} retIva={retIva} retIibb={retIibb} retSuss={retSuss} />
      <ExpenseReport expenses={expenses || []} isLoading={isLoadingExpenses} />
    </div>
  );
}
