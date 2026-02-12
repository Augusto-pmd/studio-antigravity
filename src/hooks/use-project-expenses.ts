'use client';

import { useMemo, useCallback } from 'react';
import { useCollection, useFirestore } from '@/firebase';
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
    
  const wageHistoriesQuery = useMemo(() => (firestore ? collectionGroup(firestore, 'dailyWageHistory').withConverter(dailyWageHistoryConverter) : null), [firestore]);
  const { data: wageHistories, isLoading: isLoadingWageHistories } = useCollection(wageHistoriesQuery);

   const fundRequestsQuery = useMemo(
    () =>
      firestore
        ? query(
            collection(firestore, 'fundRequests').withConverter(
              fundRequestConverter
            ),
            where('projectId', '==', projectId),
            where('status', 'in', ['Aprobado', 'Pagado'])
          )
        : null,
    [firestore, projectId]
  );
  const { data: fundRequests, isLoading: isLoadingFundRequests } = useCollection<FundRequest>(fundRequestsQuery);

  const isLoading =
    isLoadingProjectExpenses ||
    isLoadingTimeLogs ||
    isLoadingTechOffice ||
    isLoadingSiteEmployees ||
    isLoadingAttendances ||
    isLoadingPayrollWeeks ||
    isLoadingCashAdvances ||
    isLoadingWageHistories ||
    isLoadingFundRequests;
    
  const getWageForDate = useCallback((employeeId: string, date: string): number => {
    if (!wageHistories || !siteEmployees) {
        const employee = siteEmployees?.find(e => e.id === employeeId);
        return employee?.dailyWage || 0;
    }

    const histories = wageHistories
        .filter((h: any) => h.employeeId === employeeId && new Date(h.effectiveDate) <= new Date(date))
        .sort((a: any, b: any) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    if (histories.length > 0) {
        return histories[0].amount;
    }
    const employee = siteEmployees.find((e: Employee) => e.id === employeeId);
    return employee?.dailyWage || 0;
  }, [wageHistories, siteEmployees]);

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
          description: `Costo Horas Oficina: ${employeeData.name}`,
        } as Expense;
      })
      .filter((e): e is Expense => e !== null);
  }, [projectTimeLogs, techOfficeEmployees, representativeExchangeRate]);

  // Create virtual expenses for site payroll and advances, grouped by week
  const payrollExpenses = useMemo((): Expense[] => {
    if (!attendances || !siteEmployees || !payrollWeeks || !cashAdvances || !wageHistories) return [];

    const weeklyData = new Map<string, { week: PayrollWeek; attendanceCost: number; advanceCost: number }>();

    // Initialize map with all relevant weeks from payrollWeeks to ensure all weeks are considered
    payrollWeeks.forEach(week => {
      weeklyData.set(week.id, { week, attendanceCost: 0, advanceCost: 0 });
    });

    // Process attendances
    attendances.forEach((att: Attendance) => {
      if (att.status !== 'presente' || !att.payrollWeekId) return;

      const data = weeklyData.get(att.payrollWeekId);
      if (data) {
        const wageForDay = getWageForDate(att.employeeId, att.date);
        data.attendanceCost += wageForDay;
      }
    });

    // Process cash advances
    cashAdvances.forEach((advance: CashAdvance) => {
      if (!advance.payrollWeekId) return;
      const data = weeklyData.get(advance.payrollWeekId);
      if (data) {
        data.advanceCost += advance.amount;
      }
    });

    // Create virtual expenses from aggregated data
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
          date: week.endDate, // Use week end date for sorting
          supplierId: 'personal-propio',
          categoryId: 'CAT-02', // Mano de Obra
          documentType: 'Recibo Común',
          amount: totalCost,
          currency: 'ARS',
          exchangeRate: week.exchangeRate,
          status: 'Pagado',
          description: descriptionWithDate,
        } as Expense;
      });
  }, [attendances, siteEmployees, payrollWeeks, cashAdvances, projectId, getWageForDate, wageHistories]);

  const fundRequestExpenses = useMemo((): Expense[] => {
    if (!fundRequests) return [];

    return fundRequests.map((req: FundRequest): Expense => {
      const amountInARS =
        req.currency === 'USD'
          ? req.amount * (req.exchangeRate || representativeExchangeRate)
          : req.amount;
      
      let categoryId = 'CAT-12'; // Default to "Otros"
      if (req.category === 'Materiales') categoryId = 'CAT-01';
      if (req.category === 'Logística y PMD') categoryId = 'CAT-04';
      if (req.category === 'Viáticos') categoryId = 'CAT-09';
      
      return {
        id: `fund-req-${req.id}`,
        projectId: req.projectId!,
        date: req.date,
        supplierId: 'solicitudes-fondos',
        categoryId: categoryId,
        documentType: 'Recibo Común',
        amount: amountInARS,
        currency: 'ARS',
        exchangeRate: 1, // Already converted
        status: 'Pagado',
        description: `Solicitud: ${req.requesterName} - ${
          req.description || req.category
        }`,
      } as Expense;
    });
  }, [fundRequests, representativeExchangeRate]);


  const allExpenses = useMemo(() => {
    const combined = [...(projectExpenses || []), ...officeExpenses, ...payrollExpenses, ...fundRequestExpenses];
    // Sort by date descending (most recent first)
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [projectExpenses, officeExpenses, payrollExpenses, fundRequestExpenses]);

  return { expenses: allExpenses, isLoading };
}
