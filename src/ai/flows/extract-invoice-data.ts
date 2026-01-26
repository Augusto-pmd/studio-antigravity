'use server';

/**
 * @fileOverview Flow to extract structured data from an invoice image.
 *
 * - extractInvoiceData - A function that takes an image data URI and returns structured invoice data.
 */

import { ai } from '@/ai/genkit';
import { InvoiceDataSchema } from '@/ai/schemas';
import { z } from 'zod';

const ExtractInvoiceInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of an invoice or receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const extractInvoiceDataPrompt = ai.definePrompt({
    name: 'extractInvoiceDataPrompt',
    input: { schema: ExtractInvoiceInputSchema },
    output: { schema: InvoiceDataSchema },
    prompt: `You are an expert accounting assistant specialized in reading Argentinian invoices, tickets, and receipts ("comprobantes").
Your task is to extract the following information from the provided image and return it in a structured JSON format.

- invoiceNumber: Find the "Factura Nro", "Comprobante Nro", "Ticket Nro", etc. It usually has a format like "0001-00001234".
- amount: The final total amount. Look for keywords like "TOTAL", "Total a Pagar".
- iva: The discriminated VAT amount. Look for "IVA 21%", "IVA", etc. If there are multiple, sum them up. If it's not discriminated, do not include it.
- iibb: The discriminated Gross Income tax perception. Look for "Perc. IIBB", "Percepción Ingresos Brutos". If not present, do not include it.
- date: The date of the document. Look for "Fecha", "Fecha de Emisión". Return it in YYYY-MM-DD format.
- supplierName: The name of the supplier/vendor ("proveedor" or "razón social").
- supplierCuit: The CUIT of the supplier. It's an 11-digit number, often formatted as XX-XXXXXXXX-X.

Analyze the following image:
{{media url=imageDataUri}}

Provide the extracted data in the requested JSON format. If a field is not found, omit it from the response.
`,
});

const extractInvoiceDataFlow = ai.defineFlow(
    {
        name: 'extractInvoiceDataFlow',
        inputSchema: ExtractInvoiceInputSchema,
        outputSchema: InvoiceDataSchema,
    },
    async (input) => {
        const { output } = await extractInvoiceDataPrompt(input);
        return output!;
    }
);

export async function extractInvoiceData(
  imageDataUri: string
): Promise<z.infer<typeof InvoiceDataSchema>> {
  return await extractInvoiceDataFlow({ imageDataUri });
}
