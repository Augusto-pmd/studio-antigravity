"use server";
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { generateDashboardSummary } from '@/ai/flows/generate-dashboard-summary';
import { projects, taskRequests } from '@/lib/data';


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

export async function generateDashboardSummaryAction() {
  try {
    const activeProjects = projects
      .filter(p => p.status === 'En Curso')
      .map(p => ({
        name: p.name,
        status: p.status,
        progress: p.progress,
        supervisor: p.supervisor,
      }));

    const pendingTasks = taskRequests
        .filter(t => t.status === 'Pendiente')
        .map(t => ({
            title: t.title,
            assigneeName: t.assigneeName,
        }));
    
    // Using hardcoded stats from the stats-card component for now
    const stats = {
        obrasEnCurso: "5",
        saldoContratos: "$1,500,000",
        gastosMes: "$125,300",
    };

    const result = await generateDashboardSummary({ activeProjects, pendingTasks, stats });
    return { data: result };

  } catch (error) {
    console.error("Error generating dashboard summary:", error);
    return { error: 'No se pudo generar el resumen del dashboard.' };
  }
}
