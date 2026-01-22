'use server';
/**
 * @fileOverview Extracts fiscal data from an invoice document using an LLM.
 *
 * - extractInvoiceData - A function that analyzes an invoice and returns structured data.
 */

import {ai} from '@/ai/genkit';
import {
  ExtractInvoiceDataInput,
  ExtractInvoiceDataInputSchema,
  ExtractInvoiceDataOutput,
  ExtractInvoiceDataOutputSchema,
} from '@/ai/schemas';

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const extractInvoicePrompt = ai.definePrompt({
  name: 'extractInvoicePrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `You are an expert accountant in Argentina, specialized in reading invoices (facturas).
Analyze the following invoice document and extract the following values:
- The invoice number (Número de Factura).
- The total VAT (IVA) amount. If there are multiple VAT rates, sum them up. If no IVA is specified, return 0.
- The Gross Income tax perception (Percepción de IIBB). If not specified, return 0.
- The jurisdiction for the IIBB. If it is from the City of Buenos Aires, return 'CABA'. If it is from any other province (like Buenos Aires Province), return 'Provincia'. If there is no IIBB, return 'No Aplica'.
- The final total amount (Total). If no total is specified, return 0.

Document: {{media url=invoiceDataUri}}

Output your findings in a structured JSON format.`,
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async input => {
    const {output} = await extractInvoicePrompt(input);
    return output!;
  }
);
