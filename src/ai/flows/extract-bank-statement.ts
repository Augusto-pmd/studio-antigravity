'use server';
/**
 * @fileOverview A flow for analyzing uploaded financial statements.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnalyzedStatementSchema = z.object({
  summary: z.string().optional().describe('A high-level summary of the key findings from the financial statement.'),
  recommendations: z.string().optional().describe('Actionable recommendations for preparing the next balance sheet based on the analysis and current company status.'),
  keyMetrics: z.array(z.object({
    metric: z.string().describe('The name of the key metric identified (e.g., Total Assets, Net Income).'),
    value: z.string().describe('The value of the metric.'),
  })).optional().describe('A list of key financial metrics extracted from the document.'),
});

export type AnalyzedStatement = z.infer<typeof AnalyzedStatementSchema>;

const AnalyzeStatementInputSchema = z.object({
  fileDataUri: z.string().describe(
    "A financial document (like a balance sheet or bank statement), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  currentContext: z.string().describe('A summary of the current state of the company, including active projects, recent large expenses, etc.'),
});

export async function analyzeStatement(
  input: z.infer<typeof AnalyzeStatementInputSchema>
): Promise<AnalyzedStatement> {
  return analyzeStatementFlow(input);
}

const analysisPrompt = ai.definePrompt(
  {
    name: 'analyzeStatementPrompt',
    input: {schema: AnalyzeStatementInputSchema},
    output: {schema: AnalyzedStatementSchema},
    prompt: `You are an expert Argentinian accountant tasked with analyzing a financial document to help prepare the next balance sheet.

    Analyze the provided document in the context of the company's current situation.
    - Provide a concise summary of the document's content.
    - Extract key financial metrics.
    - Give specific, actionable recommendations for creating the next balance sheet, considering the provided context.

    Current Company Context:
    {{{currentContext}}}

    Document to Analyze:
    {{media url=fileDataUri}}`,
  }
);

const analyzeStatementFlow = ai.defineFlow(
  {
    name: 'analyzeStatementFlow',
    inputSchema: AnalyzeStatementInputSchema,
    outputSchema: AnalyzedStatementSchema,
  },
  async (input) => {
    const {output} = await analysisPrompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid analysis.");
    }
    return output;
  }
);
