"use server";
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';

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
