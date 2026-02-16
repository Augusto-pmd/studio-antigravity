
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
    async getProjectFinancials(projectId: string): Promise<ProjectFinancials> {
        // 1. Fetch Sales (Income)
        const salesRef = collection(db, 'sales');
        const salesq = query(salesRef, where('projectId', '==', projectId));
        const salesSnap = await getDocs(salesq);

        let incomeTotal = 0;
        let incomePaid = 0;

        salesSnap.forEach(doc => {
            const sale = doc.data() as Sale;
            // Only count if not cancelled
            if (sale.status !== 'Cancelado') {
                incomeTotal += sale.totalAmount;
                if (sale.status === 'Cobrado') {
                    incomePaid += sale.totalAmount;
                }
            }
        });

        // Helper for currency conversion
        const getSafeAmount = (item: any, type: string) => {
            if (item.currency === 'USD') {
                const rate = item.exchangeRate || 1200; // Fallback to 1200 if missing (should be historic)
                if (!item.exchangeRate) console.warn(`[Financials] Missing exchange rate for ${type} ${item.id}. Using default 1200.`);
                return item.amount * rate;
            }
            return item.amount || 0;
        };

        // 2. Fetch Direct Expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQ = query(expensesRef, where('projectId', '==', projectId));
        const expensesSnap = await getDocs(expensesQ);

        let materialsCost = 0;
        let servicesCost = 0;

        expensesSnap.forEach(doc => {
            const expense = doc.data() as Expense;
            const amount = getSafeAmount(expense, 'Expense');

            // Categorization
            if (expense.supplierId) {
                // We'd need to check supplier type, but for now allow generic bucket
                materialsCost += amount;
            } else {
                servicesCost += amount;
            }
        });

        // 3. Fetch Contractor Certifications (Labor)
        const certsRef = collection(db, 'contractor_certifications');
        const certsQ = query(
            certsRef,
            where('projectId', '==', projectId),
            where('status', 'in', ['Aprobado', 'Pagado']) // Only Approved or Paid
        );
        const certsSnap = await getDocs(certsQ);

        let laborCost = 0;
        certsSnap.forEach(doc => {
            const cert = doc.data() as ContractorCertification;
            const amount = getSafeAmount(cert, 'Certification');
            laborCost += amount;
        });

        // 4. Fetch Fund Requests (Petty Cash for Project)
        const fundsRef = collection(db, 'fund_requests');
        const fundsQ = query(
            fundsRef,
            where('projectId', '==', projectId),
            where('status', 'in', ['Aprobado', 'Pagado']) // Include Approved too
        );
        const fundsSnap = await getDocs(fundsQ);

        fundsSnap.forEach(doc => {
            const fund = doc.data() as FundRequest;
            const amount = getSafeAmount(fund, 'FundRequest');
            servicesCost += amount;
        });


        const totalDirect = materialsCost + servicesCost + laborCost;
        const totalIndirect = 0; // TODO: Implement indirect cost logic (prorated)
        const totalCost = totalDirect + totalIndirect;

        const netMargin = incomeTotal - totalCost;
        const marginPercentage = incomeTotal > 0 ? (netMargin / incomeTotal) * 100 : 0;
        const roi = totalCost > 0 ? (netMargin / totalCost) * 100 : 0;

        // Get Project Name
        // ... (We accept it as arg or fetch)

        return {
            projectId,
            projectName: "Unknown", // Filler
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
