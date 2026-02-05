'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { RecurringExpense, Moratoria, Expense, MonthlySalary, Contractor, Employee } from '@/lib/types';
import { startOfToday, endOfToday, addDays, isBefore, parseISO, endOfMonth } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduleItem } from '@/components/calendario-pagos/schedule-item';

// --- Converters ---
const recurringExpenseConverter = { toFirestore: (data: RecurringExpense): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RecurringExpense => ({ ...snapshot.data(options), id: snapshot.id } as RecurringExpense) };
const moratoriaConverter = { toFirestore: (data: Moratoria): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Moratoria => ({ ...snapshot.data(options), id: snapshot.id } as Moratoria) };
const expenseConverter = { toFirestore: (data: Expense): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Expense => ({ ...snapshot.data(options), id: snapshot.id } as Expense) };
const monthlySalaryConverter = { toFirestore: (data: MonthlySalary): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): MonthlySalary => ({ ...snapshot.data(options), id: snapshot.id } as MonthlySalary) };
const contractorConverter = { toFirestore: (data: Contractor): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Contractor => ({ ...snapshot.data(options), id: snapshot.id } as Contractor) };
const employeeConverter = { toFirestore: (data: Employee): DocumentData => data, fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Employee => ({ ...snapshot.data(options), id: snapshot.id } as Employee) };


export function PaymentSchedule() {
  const firestore = useFirestore();

  // --- Data Fetching ---
  const recurringExpensesQuery = useMemo(() => firestore ? query(collection(firestore, 'recurringExpenses').withConverter(recurringExpenseConverter), where('status', '==', 'Activo')) : null, [firestore]);
  const { data: recurringExpenses, isLoading: l1 } = useCollection(recurringExpensesQuery);
  
  const moratoriasQuery = useMemo(() => firestore ? query(collection(firestore, 'moratorias').withConverter(moratoriaConverter), where('status', '==', 'Activa')) : null, [firestore]);
  const { data: moratorias, isLoading: l2 } = useCollection(moratoriasQuery);
  
  const pendingExpensesQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'expenses').withConverter(expenseConverter), where('status', '==', 'Pendiente de Pago')) : null, [firestore]);
  const { data: pendingExpenses, isLoading: l3 } = useCollection(pendingExpensesQuery);

  const pendingSalariesQuery = useMemo(() => firestore ? query(collection(firestore, 'monthlySalaries').withConverter(monthlySalaryConverter), where('status', '==', 'Pendiente de Pago')) : null, [firestore]);
  const { data: pendingSalaries, isLoading: l4 } = useCollection(pendingSalariesQuery);

  const contractorsQuery = useMemo(() => firestore ? collection(firestore, 'contractors').withConverter(contractorConverter) : null, [firestore]);
  const { data: contractors, isLoading: l5 } = useCollection(contractorsQuery);

  const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees').withConverter(employeeConverter) : null, [firestore]);
  const { data: employees, isLoading: l6 } = useCollection(employeesQuery);

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  // --- Data Processing ---
  const allItems = useMemo(() => {
    const processedItems: any[] = [];

    // Recurring Expenses
    recurringExpenses?.forEach((item: RecurringExpense) => {
      if (item.nextDueDate) {
        processedItems.push({
          id: `re-${item.id}`,
          date: parseISO(item.nextDueDate),
          title: item.description,
          description: `Gasto Recurrente (${item.period})`,
          amount: item.amount,
          currency: item.currency,
          type: 'Gasto Recurrente',
          itemData: item
        });
      }
    });

    // Moratorias
    moratorias?.forEach((item: Moratoria) => {
      if (item.nextDueDate) {
        processedItems.push({
          id: `m-${item.id}`,
          date: parseISO(item.nextDueDate),
          title: item.name,
          description: `Cuota ${item.paidInstallments + 1}/${item.installments} de ${item.tax}`,
          amount: item.installmentAmount,
          currency: 'ARS',
          type: 'Moratoria',
          itemData: item
        });
      }
    });

    // Pending Supplier Expenses
    pendingExpenses?.forEach((item: Expense) => {
      if (item.date) {
        processedItems.push({
          id: `exp-${item.id}`,
          date: parseISO(item.date),
          title: `Factura Proveedor`,
          description: item.invoiceNumber || `Gasto ID: ${item.id.substring(0,6)}`,
          amount: item.amount,
          currency: item.currency,
          type: 'Factura Proveedor',
          itemData: item
        });
      }
    });

    // Pending Salaries
    pendingSalaries?.forEach((item: MonthlySalary) => {
      if (item.period) {
        processedItems.push({
          id: `sal-${item.id}`,
          date: endOfMonth(parseISO(item.period + '-01')),
          title: `Sueldo ${item.employeeName}`,
          description: `Período ${item.period}`,
          amount: item.netSalary,
          currency: 'ARS',
          type: 'Sueldo',
          itemData: item
        });
      }
    });
    
    // Contractor ART/Insurance Expirations
    contractors?.forEach((c: Contractor) => {
        if(c.artExpiryDate) processedItems.push({ id: `c-art-${c.id}`, date: parseISO(c.artExpiryDate), title: `Vencimiento ART`, description: `Contratista: ${c.name}`, type: 'Vencimiento DOC', itemData: c });
        if(c.insuranceExpiryDate) processedItems.push({ id: `c-ins-${c.id}`, date: parseISO(c.insuranceExpiryDate), title: `Vencimiento Seguro`, description: `Contratista: ${c.name}`, type: 'Vencimiento DOC', itemData: c });
    })
    
    // Employee ART Expirations
    employees?.forEach((e: Employee) => {
        if(e.artExpiryDate) processedItems.push({ id: `e-art-${e.id}`, date: parseISO(e.artExpiryDate), title: `Vencimiento ART`, description: `Empleado: ${e.name}`, type: 'Vencimiento DOC', itemData: e });
    })

    // Filter out items with invalid dates before sorting
    const validItems = processedItems.filter((item: any) => item.date && !isNaN(item.date.getTime()));

    // Sort all valid items by date
    return validItems.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [recurringExpenses, moratorias, pendingExpenses, pendingSalaries, contractors, employees]);

  // --- Grouping Logic ---
  const { overdue, today, next7Days, next30Days, later } = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const sevenDaysFromNow = addDays(todayEnd, 7);
    const thirtyDaysFromNow = addDays(todayEnd, 30);
    
    const groups = { overdue: [] as any[], today: [] as any[], next7Days: [] as any[], next30Days: [] as any[], later: [] as any[] };

    if (!allItems) return groups;

    return allItems.reduce((acc: any, item: any) => {
      // This check is now safer because allItems only contains valid dates
      if (isBefore(item.date, todayStart)) {
        acc.overdue.push(item);
      } else if (item.date >= todayStart && item.date <= todayEnd) {
        acc.today.push(item);
      } else if (item.date > todayEnd && item.date <= sevenDaysFromNow) {
        acc.next7Days.push(item);
      } else if (item.date > sevenDaysFromNow && item.date <= thirtyDaysFromNow) {
        acc.next30Days.push(item);
      } else if (item.date > thirtyDaysFromNow) {
        acc.later.push(item);
      }
      return acc;
    }, groups);
  }, [allItems]);

  const scheduleGroups = [
    { title: 'Vencidos', items: overdue, defaultOpen: true, variant: 'destructive' },
    { title: 'Vence Hoy', items: today, defaultOpen: true, variant: 'warning' },
    { title: 'Próximos 7 Días', items: next7Days, defaultOpen: true },
    { title: 'Próximos 30 Días', items: next30Days, defaultOpen: false },
    { title: 'Más Adelante', items: later, defaultOpen: false },
  ];

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Accordion type="multiple" defaultValue={scheduleGroups.filter((g: any) => g.defaultOpen).map((g: any) => g.title)} className="w-full">
            {scheduleGroups.map((group: any) => group.items.length > 0 && (
                <AccordionItem value={group.title} key={group.title}>
                    <AccordionTrigger className="px-6 text-lg font-medium hover:no-underline">
                        <div className="flex items-center gap-4">
                           {group.title}
                           <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${group.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : group.variant === 'warning' ? 'bg-yellow-500 text-white' : 'bg-muted text-muted-foreground' }`}>
                             {group.items.length}
                           </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 sm:px-4">
                        <div className="space-y-2">
                            {group.items.map((item: any) => (
                               <ScheduleItem key={item.id} item={item} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
