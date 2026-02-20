'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
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
import { getHistoricalRate } from "@/lib/exchange-rate";

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

  // 3. Fetch Time Logs and Tech Office Employees for Office Staff Costs
  const timeLogsQuery = useMemo(
    () =>
      firestore
        ? query(
          collection(firestore, 'timeLogs').withConverter(timeLogConverter),
          where('projectId', '==', projectId)
        )
        : null,
    [firestore, projectId]
  );
  const { data: timeLogs, isLoading: isLoadingTimeLogs } = useCollection<TimeLog>(timeLogsQuery);

  const techOfficeEmployeesQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'technicalOfficeEmployees').withConverter(
          techOfficeEmployeeConverter
        )
        : null,
    [firestore]
  );
  const { data: techOfficeEmployees, isLoading: isLoadingTechOfficeEmployees } =
    useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

  const isLoading =
    isLoadingProjectExpenses ||
    isLoadingSiteEmployees ||
    isLoadingAttendances ||
    isLoadingPayrollWeeks ||
    isLoadingCashAdvances ||
    isLoadingWageHistories ||
    isLoadingTimeLogs ||
    isLoadingTechOfficeEmployees;

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

  // ... existing code ...
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!payrollWeeks) return;

    const fetchRates = async () => {
      const newRates: Record<string, number> = {};
      for (const week of payrollWeeks) {
        if (!week.exchangeRate || week.exchangeRate <= 1) {
          // If the week doesn't have a stored rate, fetch it
          // We use the week's end date (Friday) as reference
          const date = parseISO(week.endDate);
          const rate = await getHistoricalRate(date);
          if (rate > 0) {
            newRates[week.id] = rate;
          }
        }
      }
      if (Object.keys(newRates).length > 0) {
        setExchangeRates(prev => ({ ...prev, ...newRates }));
      }
    };

    fetchRates();
  }, [payrollWeeks]);

  const payrollExpenses = useMemo((): Expense[] => {
    if (isLoading || !attendances || !siteEmployees || !payrollWeeks || !cashAdvances) return [];

    // ... existing map logic ...
    const weeklyData = new Map<string, { week: PayrollWeek; attendanceCost: number; advanceCost: number }>();

    payrollWeeks.forEach(week => {
      weeklyData.set(week.id, { week, attendanceCost: 0, advanceCost: 0 });
    });

    // ... existing loop ...
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
          // ...
          description = 'Costo Personal y Adelantos';
        } else if (attendanceCost > 0) {
          description = 'Costo Mano de Obra';
        } else if (advanceCost > 0) {
          description = 'Adelantos de Personal';
        }

        const descriptionWithDate = `${description} - Semana ${format(parseISO(week.startDate), 'dd/MM/yy')} to ${format(parseISO(week.endDate), 'dd/MM/yy')}`;

        // Use week's rate OR fetched rate OR 1 as fallback
        const weekRate = week.exchangeRate || 0;
        const rate = weekRate > 1 ? weekRate : (exchangeRates[week.id] || 1);

        return {
          id: `payroll-week-${week.id}`, // Virtual ID
          projectId,
          date: week.endDate,
          supplierId: 'personal-propio', // Virtual Supplier
          categoryId: 'CAT-02', // Mano de Obra
          documentType: 'Recibo Común', // Virtual Doc Type
          description: descriptionWithDate,
          amount: totalCost,
          currency: 'ARS',
          exchangeRate: rate,
          status: 'Pagado',
          paymentMethod: 'Efectivo',
          paidDate: week.endDate,
          paymentSource: 'Tesorería' // Assumed
        };
      });
  }, [isLoading, attendances, siteEmployees, payrollWeeks, cashAdvances, projectId, getWageForDate, exchangeRates]);

  const officePayrollExpenses = useMemo((): Expense[] => {
    if (isLoading || !timeLogs || !techOfficeEmployees || timeLogs.length === 0) return [];

    const employeeRateMap = new Map<string, number>();
    techOfficeEmployees.forEach(emp => {
      employeeRateMap.set(emp.userId, (emp.monthlySalary || 0) / 160); // Assume 160h/month
    });

    // Group logs by Month (YYYY-MM)
    const monthlyData = new Map<string, { totalCost: number; date: string }>();

    timeLogs.forEach(log => {
      const rate = employeeRateMap.get(log.userId);
      if (!rate || rate <= 0) return;

      const dateObj = parseISO(log.date);
      const monthKey = format(dateObj, 'yyyy-MM');
      const data = monthlyData.get(monthKey) || { totalCost: 0, date: log.date };

      data.totalCost += (log.hours || 0) * rate;
      // Keep the latest date for the group
      if (new Date(log.date).getTime() > new Date(data.date).getTime()) {
        data.date = log.date;
      }
      monthlyData.set(monthKey, data);
    });

    return Array.from(monthlyData.entries())
      .filter(([_, data]) => data.totalCost > 0)
      .map(([monthKey, data]): Expense => {
        return {
          id: `office-payroll-${monthKey}`, // Virtual ID
          projectId,
          date: data.date,
          supplierId: 'personal-oficina', // Virtual Supplier
          categoryId: 'CAT-02', // Mano de Obra
          documentType: 'Recibo Común', // Virtual
          description: `Horas Oficina Técnica - ${format(parseISO(`${monthKey}-01`), 'MMMM yyyy')}`,
          amount: data.totalCost,
          currency: 'ARS',
          exchangeRate: 1, // Optional: You could fetch historical rate for this month if needed
          status: 'Pagado',
          paymentMethod: 'Transferencia',
          paidDate: data.date,
          paymentSource: 'Tesorería'
        };
      });
  }, [isLoading, timeLogs, techOfficeEmployees, projectId]);

  const allExpenses = useMemo(() => {
    // Merge real expenses (Project) + Virtual (Site Payroll) + Virtual (Office Payroll)
    const combined = [...(projectExpenses || []), ...payrollExpenses, ...officePayrollExpenses];
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [projectExpenses, payrollExpenses, officePayrollExpenses]);

  return { expenses: allExpenses, isLoading };
}
