'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type {
  Expense,
  TimeLog,
  TechnicalOfficeEmployee,
  Employee,
  Attendance,
  PayrollWeek,
  CashAdvance,
} from '@/lib/types';
import {
  timeLogConverter,
  techOfficeEmployeeConverter,
  employeeConverter,
  attendanceConverter,
  expenseConverter,
  payrollWeekConverter,
  cashAdvanceConverter,
} from '@/lib/converters';
import { format, parseISO } from 'date-fns';

export function useProjectExpenses(projectId: string) {
  const firestore = useFirestore();

  // Fetch all data sources required for expense calculation
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
  
  const payrollWeeksQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'payrollWeeks').withConverter(payrollWeekConverter)
        : null,
    [firestore]
  );
  const { data: payrollWeeks, isLoading: isLoadingPayrollWeeks } = useCollection<PayrollWeek>(payrollWeeksQuery);

  const representativeExchangeRate = useMemo(() => {
    if (!projectExpenses) return 1;
    const expensesWithValidRate = projectExpenses
      .filter((e) => e.exchangeRate && e.exchangeRate > 1 && e.date)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    return expensesWithValidRate.length > 0
      ? expensesWithValidRate[0].exchangeRate
      : 1;
  }, [projectExpenses]);

  const allTimeLogsQuery = useMemo(
    () =>
      firestore
        ? query(
            collection(firestore, 'timeLogs').withConverter(timeLogConverter),
            where('projectId', '==', projectId)
          )
        : null,
    [firestore, projectId]
  );
  const { data: projectTimeLogs, isLoading: isLoadingTimeLogs } =
    useCollection<TimeLog>(allTimeLogsQuery);

  const techOfficeEmployeesQuery = useMemo(
    () =>
      firestore
        ? collection(firestore, 'technicalOfficeEmployees').withConverter(
            techOfficeEmployeeConverter
          )
        : null,
    [firestore]
  );
  const { data: techOfficeEmployees, isLoading: isLoadingTechOffice } =
    useCollection<TechnicalOfficeEmployee>(techOfficeEmployeesQuery);

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

  const isLoading =
    isLoadingProjectExpenses ||
    isLoadingTimeLogs ||
    isLoadingTechOffice ||
    isLoadingSiteEmployees ||
    isLoadingAttendances ||
    isLoadingPayrollWeeks ||
    isLoadingCashAdvances;

  // Create virtual expenses for office hours
  const officeExpenses = useMemo((): Expense[] => {
    if (!projectTimeLogs || !techOfficeEmployees) return [];

    const employeeSalaryMap = new Map(
      techOfficeEmployees.map((e: TechnicalOfficeEmployee) => [
        e.userId,
        { salary: e.monthlySalary, name: e.fullName },
      ])
    );

    return projectTimeLogs
      .map((log: TimeLog): Expense | null => {
        const employeeData = employeeSalaryMap.get(log.userId);
        if (!employeeData) return null;

        // Assume 160 working hours in a month.
        const hourlyRate = employeeData.salary / 160;
        const cost = (log.hours || 0) * hourlyRate;

        return {
          id: `log-${log.id}`,
          projectId: log.projectId,
          date: log.date,
          supplierId: 'OFICINA-TECNICA',
          categoryId: 'CAT-14', // Oficina Técnica (Costo)
          documentType: 'Recibo Común',
          amount: cost,
          currency: 'ARS',
          exchangeRate: representativeExchangeRate,
          status: 'Pagado',
          description: `Costo Horas: ${employeeData.name}`,
        } as Expense;
      })
      .filter((e): e is Expense => e !== null);
  }, [projectTimeLogs, techOfficeEmployees, representativeExchangeRate]);

  // Create virtual expenses for site payroll and advances, grouped by week
  const payrollExpenses = useMemo((): Expense[] => {
    if (!attendances || !siteEmployees || !payrollWeeks || !cashAdvances) return [];

    const employeeWageMap = new Map(
      siteEmployees.map((e: Employee) => [e.id, { wage: e.dailyWage, name: e.name }])
    );

    const weeklyCosts = new Map<string, { totalCost: number, week: PayrollWeek }>();

    // Aggregate attendance costs per week
    attendances.forEach((att: Attendance) => {
        if (att.status !== 'presente') return;

        const employeeData = employeeWageMap.get(att.employeeId);
        if (!employeeData) return;
        
        const week = payrollWeeks.find(pw => pw.id === att.payrollWeekId);
        if (!week) return;

        const weeklyCost = weeklyCosts.get(att.payrollWeekId) || { totalCost: 0, week };
        weeklyCost.totalCost += employeeData.wage;
        weeklyCosts.set(att.payrollWeekId, weeklyCost);
    });

    // Aggregate cash advance costs per week
    cashAdvances.forEach((advance: CashAdvance) => {
      const week = payrollWeeks.find(pw => pw.id === advance.payrollWeekId);
      if (!week) return;
      
      const weeklyCost = weeklyCosts.get(advance.payrollWeekId) || { totalCost: 0, week };
      weeklyCost.totalCost += advance.amount;
      weeklyCosts.set(advance.payrollWeekId, weeklyCost);
    });

    return Array.from(weeklyCosts.entries()).map(([weekId, data]): Expense => {
        const { totalCost, week } = data;
        
        return {
            id: `payroll-week-${weekId}`,
            projectId,
            date: week.endDate, // Use week end date for sorting
            supplierId: 'personal-propio',
            categoryId: 'CAT-02', // Mano de Obra
            documentType: 'Recibo Común',
            amount: totalCost,
            currency: 'ARS',
            exchangeRate: week.exchangeRate || 1,
            status: 'Pagado',
            description: `Costo de personal y adelantos - Semana ${format(parseISO(week.startDate), 'dd/MM/yyyy')} al ${format(parseISO(week.endDate), 'dd/MM/yyyy')}`,
        } as Expense;
    });

  }, [attendances, siteEmployees, payrollWeeks, cashAdvances, projectId, representativeExchangeRate]);

  const allExpenses = useMemo(() => {
    const combined = [...(projectExpenses || []), ...officeExpenses, ...payrollExpenses];
    // Sort by date descending (most recent first)
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [projectExpenses, officeExpenses, payrollExpenses]);

  return { expenses: allExpenses, isLoading };
}
