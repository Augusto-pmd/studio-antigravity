'use client';

import { useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type {
  Expense,
  TimeLog,
  TechnicalOfficeEmployee,
  Employee,
  Attendance,
  PayrollWeek,
  CashAdvance,
  DailyWageHistory,
  FundRequest,
} from '@/lib/types';
import {
  timeLogConverter,
  techOfficeEmployeeConverter,
  employeeConverter,
  attendanceConverter,
  expenseConverter,
  payrollWeekConverter,
  cashAdvanceConverter,
  dailyWageHistoryConverter,
  fundRequestConverter,
} from '@/lib/converters';
import { format, parseISO } from 'date-fns';

export function useProjectExpenses(projectId: string) {
  const firestore = useFirestore();
  const { permissions } = useUser();

  // 1. Fetch direct project expenses (includes User Cash & Fund Requests transformed to expenses)
  const projectExpensesQuery = useMemo(
    () =>
      firestore
        ? query(
          collection(firestore, `projects/${projectId}/expenses`).withConverter(
            expenseConverter
          )
        )
        : null,
    [firestore, projectId]
  );
  const { data: projectExpenses, isLoading: isLoadingProjectExpenses } =
    useCollection<Expense>(projectExpensesQuery);

  // 2. Fetch Payroll Data for "Mano de Obra" calculation (Virtual Expenses)
  const payrollWeeksQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter)
        : null,
    [firestore]
  );
  const { data: payrollWeeks, isLoading: isLoadingPayrollWeeks } = useCollection<PayrollWeek>(payrollWeeksQuery);

  const siteEmployeesQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'employees').withConverter(employeeConverter)
        : null,
    [firestore]
  );
  const { data: siteEmployees, isLoading: isLoadingSiteEmployees } =
    useCollection<Employee>(siteEmployeesQuery);

  const attendancesQuery = useMemo(
    () =>
      firestore
        ? query(
          collection(firestore, 'attendances').withConverter(
            attendanceConverter
          ),
          where('projectId', '==', projectId)
        )
        : null,
    [firestore, projectId]
  );
  const { data: attendances, isLoading: isLoadingAttendances } =
    useCollection<Attendance>(attendancesQuery);

  const cashAdvancesQuery = useMemo(
    () =>
      firestore
        ? query(
          collection(firestore, 'cashAdvances').withConverter(
            cashAdvanceConverter
          ),
          where('projectId', '==', projectId)
        )
        : null,
    [firestore, projectId]
  );
  const { data: cashAdvances, isLoading: isLoadingCashAdvances } =
    useCollection<CashAdvance>(cashAdvancesQuery);

  const wageHistoriesQuery = useMemo(() => (firestore && permissions.canSupervise ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore, permissions.canSupervise]);
  const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);

  const isLoading =
    isLoadingProjectExpenses ||
    isLoadingSiteEmployees ||
    isLoadingAttendances ||
    isLoadingPayrollWeeks ||
    isLoadingCashAdvances ||
    isLoadingWageHistories;

  const getWageForDate = useCallback((employeeId: string, date: string): number => {
    if (!siteEmployees) return 0;
    const currentEmployee = siteEmployees.find((e) => e.id === employeeId);

    if (!permissions.canSupervise || !wageHistories) {
      return currentEmployee?.dailyWage || 0;
    }

    const histories = wageHistories
      .filter(h => (h as any).employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    if (histories.length > 0) {
      return histories[0].amount;
    }

    return currentEmployee?.dailyWage || 0;
  }, [wageHistories, siteEmployees, permissions.canSupervise]);

  const payrollExpenses = useMemo((): Expense[] => {
    if (isLoading || !attendances || !siteEmployees || !payrollWeeks || !cashAdvances) return [];

    const weeklyData = new Map<string, { week: PayrollWeek; attendanceCost: number; advanceCost: number }>();

    payrollWeeks.forEach(week => {
      weeklyData.set(week.id, { week, attendanceCost: 0, advanceCost: 0 });
    });

    attendances.forEach((att) => {
      if (att.status !== 'presente' || !att.payrollWeekId) return;

      const data = weeklyData.get(att.payrollWeekId);
      if (data) {
        const wageForDay = getWageForDate(att.employeeId, att.date);
        data.attendanceCost += wageForDay;
      }
    });

    cashAdvances.forEach((advance) => {
      if (!advance.payrollWeekId) return;
      const data = weeklyData.get(advance.payrollWeekId);
      if (data) {
        data.advanceCost += advance.amount;
      }
    });

    return Array.from(weeklyData.values())
      .filter(data => data.attendanceCost > 0 || data.advanceCost > 0)
      .map((data): Expense => {
        const { week, attendanceCost, advanceCost } = data;
        const totalCost = attendanceCost + advanceCost;

        let description = 'Costo Desconocido';
        if (attendanceCost > 0 && advanceCost > 0) {
          description = 'Costo Personal y Adelantos';
        } else if (attendanceCost > 0) {
          description = 'Costo Mano de Obra';
        } else if (advanceCost > 0) {
          description = 'Adelantos de Personal';
        }

        const descriptionWithDate = `${description} - Semana ${format(parseISO(week.startDate), 'dd/MM/yy')} a ${format(parseISO(week.endDate), 'dd/MM/yy')}`;

        return {
          id: `payroll-week-${week.id}`,
          projectId,
          date: week.endDate,
          supplierId: 'personal-propio',
          categoryId: 'CAT-02', // Mano de Obra
          documentType: 'Recibo Común',
          amount: totalCost,
          currency: 'ARS',
          exchangeRate: week.exchangeRate || 0,
          status: 'Pagado',
          paymentSource: 'Tesorería',
          description: descriptionWithDate,
        } as Expense;
      });
  }, [isLoading, attendances, siteEmployees, payrollWeeks, cashAdvances, projectId, getWageForDate]);


  const allExpenses = useMemo(() => {
    // Merge real expenses (Project, User Cash, Approved Funds, Contractor Certs) + Virtual (Payroll)
    const combined = [...(projectExpenses || []), ...payrollExpenses];
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [projectExpenses, payrollExpenses]);

  return { expenses: allExpenses, isLoading };
}
