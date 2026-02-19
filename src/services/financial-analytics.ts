
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Project, Expense, Sale, ContractorCertification, FundRequest, MonthlySalary } from '@/lib/types';

export interface ProjectFinancials {
    projectId: string;
    projectName: string;
    income: {
        total: number;
        paid: number;
        pending: number;
    };
    costs: {
        direct: {
            materials: number;
            labor: number; // Contractors + Employees
            services: number;
            total: number;
        };
        indirect: {
            // Prorated or specific
            total: number;
        };
        total: number; // Direct + Indirect
    };
    margin: {
        net: number; // Income - Total Cost
        percentage: number; // (Net / Income) * 100
    };
    roi: number; // (Net / Total Cost) * 100
}

export const FinancialAnalyticsService = {
    async getProjectFinancials(projectId: string, year?: number): Promise<ProjectFinancials> {
        const currentYear = new Date().getFullYear();
        const targetYear = year || currentYear;
        const startStr = `${targetYear}-01-01`;
        const endStr = `${targetYear}-12-31`;

        // Helper for currency conversion
        // Fetch global exchange rate as fallback
        let globalExchangeRate = 1;
        try {
            const settingsSnap = await getDocs(query(collection(db, 'settings')));
            settingsSnap.forEach(d => {
                if (d.id === 'general' && d.data().exchangeRate) {
                    globalExchangeRate = d.data().exchangeRate;
                }
            });
        } catch { /* ignore, use default */ }

        const getSafeAmount = (item: any, type: string) => {
            if (item.currency === 'USD') {
                const rate = item.exchangeRate || globalExchangeRate;
                if (!item.exchangeRate) console.warn(`[Financials] Missing exchange rate for ${type} ${item.id}. Using global rate: ${rate}.`);
                return item.amount * rate;
            }
            return item.amount || 0;
        };

        // 1. Fetch Sales (Income)
        const salesRef = collection(db, 'projects', projectId, 'sales');
        const salesQ = query(salesRef, where('date', '>=', startStr), where('date', '<=', endStr));
        const salesSnap = await getDocs(salesQ);

        let incomeTotal = 0;
        let incomePaid = 0;

        salesSnap.forEach(doc => {
            const sale = doc.data() as Sale;
            if (sale.status !== 'Cancelado') {
                incomeTotal += sale.totalAmount;
                if (sale.status === 'Cobrado') {
                    incomePaid += sale.totalAmount;
                }
            }
        });

        // 2. Fetch Direct Expenses
        const expensesRef = collection(db, 'projects', projectId, 'expenses');
        const expensesQ = query(expensesRef, where('date', '>=', startStr), where('date', '<=', endStr));
        const expensesSnap = await getDocs(expensesQ);

        let materialsCost = 0;
        let servicesCost = 0;

        expensesSnap.forEach(doc => {
            const expense = doc.data() as Expense;
            const amount = getSafeAmount(expense, 'Expense');

            // User Clarification: Both Fund Requests and Caja Chica Expenses should be imputed.
            if (expense.supplierId) {
                materialsCost += amount;
            } else {
                servicesCost += amount;
            }
        });

        // 2b. Fetch Stock Movements (Project Consumption)
        const movementsRef = collection(db, 'inventory_movements');
        const movementsQ = query(
            movementsRef,
            where('projectId', '==', projectId),
            where('type', '==', 'CHECK_OUT'), // Assuming CHECK_OUT is consumption
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const movementsSnap = await getDocs(movementsQ);

        let stockCost = 0;
        movementsSnap.forEach(doc => {
            const move = doc.data();
            // We use the recorded cost at the time of movement
            stockCost += move.totalCost || 0;
        });

        materialsCost += stockCost;

        // 3a. Fetch Contractor Certifications (External Labor)
        const certsRef = collection(db, 'contractorCertifications');
        const certsQ = query(
            certsRef,
            where('projectId', '==', projectId),
            where('status', 'in', ['Aprobado', 'Pagado']),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const certsSnap = await getDocs(certsQ);

        let laborCost = 0;
        certsSnap.forEach(doc => {
            const cert = doc.data() as ContractorCertification;
            laborCost += getSafeAmount(cert, 'Certification');
        });

        // 3b. Fetch Internal Labor (Employees based on Attendance)
        // User Request: "hours charged to each work (value comes from salary cost divided by hours)"
        // Implementation: We sum up daily wages for days present in this project.
        const attendanceRef = collection(db, 'attendances');
        const attendanceQ = query(
            attendanceRef,
            where('projectId', '==', projectId),
            where('status', '==', 'presente'),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const attendanceSnap = await getDocs(attendanceQ);

        // Optimisation: Fetch all employees once to get their dailyWage
        // In a large system, we might want to cache this or fetch only relevant IDs.
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(employeesRef);
        const employeeWages: Record<string, number> = {};
        employeesSnap.forEach(doc => {
            const emp = doc.data();
            employeeWages[doc.id] = emp.dailyWage || 0;
        });

        let internalLaborCost = 0;
        attendanceSnap.forEach(doc => {
            const att = doc.data();
            const wage = employeeWages[att.employeeId] || 0;
            // Assumption: 1 Attendance Record = 1 Day = Daily Wage
            // If we tracked hours, we would do: (wage / 8) * hours
            internalLaborCost += wage;
        });

        laborCost += internalLaborCost;

        // 4. Fetch Fund Requests
        const fundsRef = collection(db, 'fundRequests');
        const fundsQ = query(
            fundsRef,
            where('projectId', '==', projectId),
            where('status', 'in', ['Aprobado', 'Pagado']),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        const fundsSnap = await getDocs(fundsQ);

        fundsSnap.forEach(doc => {
            const fund = doc.data() as FundRequest;
            servicesCost += getSafeAmount(fund, 'FundRequest');
            // Both Funds and Expenses are added as per user request.
        });

        const totalDirect = materialsCost + servicesCost + laborCost;
        const totalIndirect = 0;
        const totalCost = totalDirect + totalIndirect;

        const netMargin = incomeTotal - totalCost;
        const marginPercentage = incomeTotal > 0 ? (netMargin / incomeTotal) * 100 : 0;
        const roi = totalCost > 0 ? (netMargin / totalCost) * 100 : 0;

        return {
            projectId,
            projectName: "Project",
            income: {
                total: incomeTotal,
                paid: incomePaid,
                pending: incomeTotal - incomePaid
            },
            costs: {
                direct: {
                    materials: materialsCost,
                    labor: laborCost,
                    services: servicesCost,
                    total: totalDirect
                },
                indirect: {
                    total: totalIndirect
                },
                total: totalCost
            },
            margin: {
                net: netMargin,
                percentage: marginPercentage
            },
            roi
        };
    }
};
