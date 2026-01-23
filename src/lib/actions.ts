'use server';
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { generateDashboardSummary } from '@/ai/flows/generate-dashboard-summary';
import { askAssistant } from '@/ai/flows/ask-assistant-flow';
import { DashboardSummaryOutput } from '@/ai/schemas';
import { extractBankStatement } from '@/ai/flows/extract-bank-statement';
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
  // NOTE: The Firebase data fetching has been temporarily disabled to resolve a critical stability issue.
  // The AI feature will use mock data until the data fetching can be re-implemented correctly.

  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0,
      }).format(value);
  }

  const stats = {
      obrasEnCurso: "5",
      saldoContratos: formatCurrency(1500000),
      gastosMes: formatCurrency(125300),
  };
  
  const activeProjects = [
      { name: 'Edificio Corporativo Central', status: 'En Curso', progress: 75, supervisor: 'Juan Pérez' },
      { name: 'Remodelación Oficinas PMD', status: 'En Curso', progress: 90, supervisor: 'Carlos Lopez' },
      { name: 'Parque Industrial Norte', status: 'En Curso', progress: 20, supervisor: 'Maria González' },
  ];
  
  const result = await generateDashboardSummary({ 
      activeProjects, 
      pendingTasks: [], // Pending tasks were already disabled due to security rule constraints.
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

export async function askAssistantAction(question: string) {
    try {
        if (!question) {
            return { answer: 'Por favor, haz una pregunta.' };
        }
        const result = await askAssistant({ question });
        return result;
    } catch (error: any) {
        console.error("Error in askAssistantAction:", error);
        return { answer: `Hubo un error al procesar tu pregunta: ${error.message}` };
    }
}
