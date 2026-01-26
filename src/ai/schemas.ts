'use server';
import { z } from 'zod';

/**
 * Defines the structured data extracted from an invoice image.
 */
export const InvoiceDataSchema = z.object({
  invoiceNumber: z.string().optional().describe('El número de la factura, si está presente. Por ejemplo: "0001-00012345".'),
  amount: z.number().optional().describe('El monto total final de la factura.'),
  iva: z.number().optional().describe('El monto de IVA discriminado en la factura, si existe.'),
  iibb: z.number().optional().describe('El monto de percepción de Ingresos Brutos (IIBB) discriminado, si existe.'),
  date: z.string().optional().describe('La fecha de emisión de la factura, en formato YYYY-MM-DD.'),
  supplierName: z.string().optional().describe('El nombre o razón social del proveedor.'),
  supplierCuit: z.string().optional().describe('El CUIT del proveedor, si está visible.'),
});

export type InvoiceData = z.infer<typeof InvoiceDataSchema>;
