'use server';
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { generateDashboardSummary } from '@/ai/flows/generate-dashboard-summary';
import { DashboardSummaryOutput } from '@/ai/schemas';
import { extractBankStatement } from '@/ai/flows/extract-bank-statement';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Project, TaskRequest } from './types';


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

  // Fetch active projects
  const projectsQuery = query(collection(firestore, 'projects'), where('status', '==', 'En Curso'), limit(5));
  const projectsSnap = await getDocs(projectsQuery);
  const activeProjects = projectsSnap.docs.map(doc => doc.data() as Project);
  
  // Fetch pending tasks is removed because server-side actions are not authenticated
  // and cannot satisfy security rules that depend on request.auth
  const pendingTasks: TaskRequest[] = [];
  
  // Using hardcoded stats from the stats-card component for now
  // We can derive obrasEnCurso from the fetched data.
  const stats = {
      obrasEnCurso: activeProjects.length.toString(),
      saldoContratos: "$1,500,000",
      gastosMes: "$125,300",
  };

  const result = await generateDashboardSummary({ 
      activeProjects: activeProjects.map(p => ({ name: p.name, status: p.status, progress: p.progress, supervisor: p.supervisor })), 
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
