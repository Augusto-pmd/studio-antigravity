'use server';
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { generateDashboardSummary } from '@/ai/flows/generate-dashboard-summary';
import { DashboardSummaryOutput } from '@/ai/schemas';
import { extractBankStatement } from '@/ai/flows/extract-bank-statement';
import { getFirestore, collection, getDocs, query, where, limit, collectionGroup } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Project, TaskRequest, Expense } from './types';


export async function extractInvoiceDataAction(dataUri: string, fileSize: number) {
  try {
    if (!dataUri) {
        return { error: 'No se ha proporcionado ningún archivo.' };
    }

    const maxFileSizeKB = 5 * 1024; // 5 MB
    if ((fileSize / 1024) > maxFileSizeKB) {
      return { error: `El archivo es demasiado grande. El tamaño máximo es de ${maxFileSizeKB/1024} MB.` };
    }

    const result = await extractInvoiceData({ invoiceDataUri: dataUri });
    return { data: result };

  } catch (error) {
    console.error("Error extracting invoice data:", error);
    return { error: 'Ocurrió un error inesperado al procesar la factura.' };
  }
}

export async function generateDashboardSummaryAction(): Promise<DashboardSummaryOutput> {
  const { firestore } = initializeFirebase();

  // 1. Fetch all projects to calculate stats
  const projectsCol = collection(firestore, 'projects');
  const projectsSnap = await getDocs(projectsCol);
  const allProjects = projectsSnap.docs.map(doc => doc.data() as Project);
  
  const activeProjects = allProjects.filter(p => p.status === 'En Curso');

  // 2. Fetch all expenses using a collection group query
  const expensesQuery = query(collectionGroup(firestore, 'expenses'));
  const expensesSnap = await getDocs(expensesQuery);
  const allExpenses = expensesSnap.docs.map(doc => doc.data() as Expense);

  // 3. Calculate stats
  const obrasEnCurso = activeProjects.length;
  
  const saldoContratos = allProjects.reduce((sum, p) => {
    // For this summary, we will assume ARS projects give a good enough overview.
    // A more complex implementation would fetch live exchange rates.
    if (p.currency === 'ARS') {
      return sum + p.balance;
    }
    return sum;
  }, 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const gastosMes = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    })
    .reduce((sum, expense) => {
      if (expense.currency === 'ARS') {
        return sum + expense.amount;
      }
      if (expense.currency === 'USD') {
        return sum + (expense.amount * expense.exchangeRate);
      }
      return sum;
    }, 0);

  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0,
      }).format(value);
  }

  const stats = {
      obrasEnCurso: obrasEnCurso.toString(),
      saldoContratos: formatCurrency(saldoContratos),
      gastosMes: formatCurrency(gastosMes),
  };
  
  // Fetch pending tasks is removed because server-side actions are not authenticated
  // and cannot satisfy security rules that depend on request.auth
  
  const result = await generateDashboardSummary({ 
      activeProjects: activeProjects.slice(0, 5).map(p => ({ name: p.name, status: p.status, progress: p.progress, supervisor: p.supervisor })), 
      pendingTasks: [], // Pass an empty array
      stats 
    });
  return result;
}

export async function extractBankStatementAction(dataUri: string, fileSize: number) {
  try {
    if (!dataUri) {
        return { error: 'No se ha proporcionado ningún archivo.' };
    }

    const maxFileSizeKB = 5 * 1024; // 5 MB
    if ((fileSize / 1024) > maxFileSizeKB) {
      return { error: `El archivo es demasiado grande. El tamaño máximo es de ${maxFileSizeKB/1024} MB.` };
    }

    const result = await extractBankStatement({ statementDataUri: dataUri });
    return { data: result };

  } catch (error) {
    console.error("Error extracting bank statement data:", error);
    return { error: 'Ocurrió un error inesperado al procesar el extracto.' };
  }
}
