import {z} from 'genkit';

// Schemas for extract-invoice-data.ts
export const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "An invoice document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

export const ExtractInvoiceDataOutputSchema = z.object({
  invoiceNumber: z.string().describe('The invoice number (Número de Factura). Return an empty string if not found.'),
  iva: z.number().describe('The VAT (IVA) amount found in the invoice. Return 0 if not found.'),
  iibb: z.number().describe('The Gross Income tax perception (Percepción de IIBB). Return 0 if not found.'),
  iibbJurisdiction: z.enum(["No Aplica", "CABA", "Provincia"]).describe("The jurisdiction for the IIBB. If it's from Buenos Aires or any other province, classify as 'Provincia'. If it's from Ciudad Autónoma de Buenos Aires, classify as 'CABA'. If no IIBB is found, classify as 'No Aplica'."),
  total: z.number().describe('The total amount of the invoice. Return 0 if not found.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

// Schemas for generate-dashboard-summary.ts
const ProjectSchema = z.object({
    name: z.string(),
    status: z.string(),
    progress: z.number(),
    supervisor: z.string(),
  });
  
  const TaskRequestSchema = z.object({
    title: z.string(),
    assigneeName: z.string(),
  });
  
  export const DashboardSummaryInputSchema = z.object({
    activeProjects: z.array(ProjectSchema),
    pendingTasks: z.array(TaskRequestSchema),
    stats: z.object({
      obrasEnCurso: z.string(),
      saldoContratos: z.string(),
      gastosMes: z.string(),
    }),
  });
  export type DashboardSummaryInput = z.infer<typeof DashboardSummaryInputSchema>;
  
  export const DashboardSummaryOutputSchema = z.object({
    summary: z.string().describe('The natural language summary of the dashboard data. Should be a single paragraph. Use Markdown for simple formatting like bold text.'),
  });
  export type DashboardSummaryOutput = z.infer<typeof DashboardSummaryOutputSchema>;

// Schemas for extract-bank-statement.ts
export const BankTransactionSchema = z.object({
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("The full description of the transaction as it appears on the statement."),
  amount: z.number().describe("The amount of the transaction. It should always be a positive number."),
  type: z.enum(['debit', 'credit']).describe("The type of transaction: 'debit' for withdrawals/payments, 'credit' for deposits/incomes."),
  suggestedCategory: z.string().describe("A suggested accounting category based on the description (e.g., 'Proveedor', 'Sueldos', 'Impuestos', 'Servicios Públicos', 'Transferencia')."),
});
export type BankTransaction = z.infer<typeof BankTransactionSchema>;

export const ExtractBankStatementInputSchema = z.object({
  statementDataUri: z
    .string()
    .describe(
      "A bank statement document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBankStatementInput = z.infer<typeof ExtractBankStatementInputSchema>;

export const ExtractBankStatementOutputSchema = z.object({
  transactions: z.array(BankTransactionSchema).describe("An array of all transactions found in the bank statement."),
});
export type ExtractBankStatementOutput = z.infer<typeof ExtractBankStatementOutputSchema>;
