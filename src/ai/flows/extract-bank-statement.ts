'use server';
/**
 * @fileOverview Extracts transaction data from a bank statement document using an LLM.
 *
 * - extractBankStatement - A function that analyzes a statement and returns structured transaction data.
 */

import {ai} from '@/ai/genkit';
import {
  ExtractBankStatementInput,
  ExtractBankStatementInputSchema,
  ExtractBankStatementOutput,
  ExtractBankStatementOutputSchema,
} from '@/ai/schemas';

export async function extractBankStatement(input: ExtractBankStatementInput): Promise<ExtractBankStatementOutput> {
  return extractBankStatementFlow(input);
}

const extractStatementPrompt = ai.definePrompt({
  name: 'extractBankStatementPrompt',
  input: {schema: ExtractBankStatementInputSchema},
  output: {schema: ExtractBankStatementOutputSchema},
  prompt: `You are an expert accountant in Argentina, specialized in reading and interpreting bank statements (extractos bancarios).
Your task is to analyze the provided bank statement document and extract all transactions.

For each transaction, you must identify:
- The date of the transaction. Standardize it to YYYY-MM-DD format.
- The full description of the transaction as it appears.
- The amount. This should always be a positive number.
- The type of transaction: 'debit' for any outgoing funds (gastos, débitos, pagos, impuestos, retenciones, etc.) and 'credit' for any incoming funds (ingresos, depósitos, créditos, etc.).
- A suggested accounting category. Based on the description, provide a concise category. Examples: "Proveedor: [Nombre]", "Sueldos", "Impuestos AFIP", "Servicios Públicos", "Transferencia recibida", "Acreditación de Intereses".

Please analyze the entire document and extract every transaction you can find.

Document: {{media url=statementDataUri}}

Output your findings as a structured JSON object containing a list of all transactions.`,
});

const extractBankStatementFlow = ai.defineFlow(
  {
    name: 'extractBankStatementFlow',
    inputSchema: ExtractBankStatementInputSchema,
    outputSchema: ExtractBankStatementOutputSchema,
  },
  async input => {
    const {output} = await extractStatementPrompt(input);
    return output!;
  }
);
