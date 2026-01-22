'use client';

import { useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collectionGroup, query } from 'firebase/firestore';
import type { Expense } from '@/lib/types';
import { useMemo } from 'react';
import { IvaSummary } from './iva-summary';
import { IibbSummary } from './iibb-summary';
import { ExpenseReport } from './expense-report';
import { Skeleton } from '../ui/skeleton';

export function AccountingDashboard() {
  const firestore = useFirestore();

  const expensesQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'expenses')) : null),
    [firestore]
  );
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const { ivaCredit, iibbCABA, iibbProvincia } = useMemo(() => {
    if (!expenses) {
      return { ivaCredit: 0, iibbCABA: 0, iibbProvincia: 0 };
    }
    return expenses.reduce(
      (acc, expense) => {
        acc.ivaCredit += expense.iva || 0;
        if (expense.iibbJurisdiction === 'CABA') {
          acc.iibbCABA += expense.iibb || 0;
        } else if (expense.iibbJurisdiction === 'Provincia') {
          acc.iibbProvincia += expense.iibb || 0;
        }
        return acc;
      },
      { ivaCredit: 0, iibbCABA: 0, iibbProvincia: 0 }
    );
  }, [expenses]);

  if (isLoadingExpenses) {
    return (
        <div className='space-y-6'>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-80" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <IvaSummary ivaCredit={ivaCredit} />
        <IibbSummary iibbCABA={iibbCABA} iibbProvincia={iibbProvincia} />
      </div>
      <ExpenseReport expenses={expenses || []} isLoading={isLoadingExpenses} />
    </div>
  );
}
