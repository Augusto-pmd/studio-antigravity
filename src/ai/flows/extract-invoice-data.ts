'use server';
/**
 * @fileOverview Extracts fiscal data from an invoice document using an LLM.
 *
 * - extractInvoiceData - A function that analyzes an invoice and returns structured data.
 * - ExtractInvoiceDataInput - The input type for the extractInvoiceData function.
 * - ExtractInvoiceDataOutput - The return type for the extractInvoiceData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "An invoice document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const ExtractInvoiceDataOutputSchema = z.object({
  iva: z.number().describe('The VAT (IVA) amount found in the invoice. Return 0 if not found.'),
  total: z.number().describe('The total amount of the invoice. Return 0 if not found.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const extractInvoicePrompt = ai.definePrompt({
  name: 'extractInvoicePrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `You are an expert accountant in Argentina, specialized in reading invoices (facturas).
Analyze the following invoice document and extract the following values:
- The total VAT (IVA) amount. If there are multiple VAT rates, sum them up. If no IVA is specified, return 0.
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
