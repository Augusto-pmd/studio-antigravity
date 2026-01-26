'use server';
/**
 * @fileOverview A flow for extracting data from invoice images.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ExtractedInvoiceDataSchema = z.object({
    supplierName: z.string().optional().describe('The name of the supplier or vendor.'),
    cuit: z.string().optional().describe('The CUIT of the supplier.'),
    date: z.string().optional().describe('The date of the invoice in YYYY-MM-DD format.'),
    invoiceNumber: z.string().optional().describe('The invoice number.'),
    amount: z.number().optional().describe('The final total amount to be paid.'),
    iva: z.number().optional().describe('The IVA (VAT) amount.'),
    iibb: z.number().optional().describe('The IIBB (gross income tax) perception amount.'),
});

export type ExtractedInvoiceData = z.infer<typeof ExtractedInvoiceDataSchema>;

const ExtractInvoiceInputSchema = z.object({
  imageDataUri: z.string().describe(
    "A photo of an invoice or receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});

export async function extractInvoiceData(
  imageDataUri: string
): Promise<ExtractedInvoiceData> {
  return extractInvoiceDataFlow({imageDataUri});
}

const extractionPrompt = ai.definePrompt(
  {
    name: 'extractInvoicePrompt',
    input: {schema: ExtractInvoiceInputSchema},
    output: {schema: ExtractedInvoiceDataSchema},
    prompt: `You are an expert Argentinian accountant specialized in reading invoices and receipts.
    Analyze the provided image of a document and extract the following information.
    Be as precise as possible. If a field is not present or you cannot determine its value, omit it.

    - supplierName: The name of the business or person issuing the document.
    - cuit: The CUIT number of the issuer. It is an 11-digit number, often formatted as XX-XXXXXXXX-X.
    - date: The date the document was issued. Convert it to YYYY-MM-DD format.
    - invoiceNumber: The official document number. Look for labels like 'FACTURA', 'COMPROBANTE N°', 'Nro.', etc. It usually consists of a prefix and a sequential number.
    - amount: The final total amount to be paid. Look for 'TOTAL'.
    - iva: The discriminated IVA (VAT) amount. Look for 'IVA 21%', 'IVA 10.5%', etc.
    - iibb: The discriminated IIBB (Percepción Ingresos Brutos) amount. Look for 'Perc. IIBB', 'IIBB', etc.

    Image to analyze: {{media url=imageDataUri}}`,
  }
);

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceInputSchema,
    outputSchema: ExtractedInvoiceDataSchema,
  },
  async (input) => {
    const {output} = await extractionPrompt(input);
    return output!;
  }
);
