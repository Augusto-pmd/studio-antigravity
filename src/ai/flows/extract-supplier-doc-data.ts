'use server';

/**
 * @fileOverview Flow to extract structured data from a supplier document (Insurance or ART certificate).
 *
 * - extractSupplierDocData - A function that takes an image data URI and returns structured document data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractSupplierDocInputSchema = z.object({
    imageDataUri: z
        .string()
        .describe(
            "A photo of an insurance certificate or ART constancia, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
});

const SupplierDocDataSchema = z.object({
    documentType: z.enum(['Seguro', 'ART']).describe('The type of document identified.'),
    expiryDate: z.string().describe('The expiration date of the coverage/certificate in YYYY-MM-DD format.'),
    supplierCuit: z.string().optional().describe('The CUIT of the supplier if present.'),
    supplierName: z.string().optional().describe('The name of the supplier if present.'),
});

const extractSupplierDocDataPrompt = ai.definePrompt({
    name: 'extractSupplierDocDataPrompt',
    input: { schema: ExtractSupplierDocInputSchema },
    output: { schema: SupplierDocDataSchema },
    prompt: `You are an expert administrative assistant specialized in reading Argentinian insurance ("Seguro de Accidentes Personales", "Seguro de Responsabilidad Civil") and ART ("Aseguradora de Riesgos del Trabajo") certificates.
Your task is to extract the following information from the provided image and return it in a structured JSON format.

- documentType: Identify if it is a 'Seguro' (Personal Accident / Liability) or 'ART' (Workers Compensation).
- expiryDate: The date when the coverage EXPIRES ("Vigencia Hasta", "Vencimiento", "Fecha de Fin"). Return it in YYYY-MM-DD format. If it says "Vigencia: 01/01/2024 al 31/01/2024", the expiry date is 2024-01-31.
- supplierName: The name of the insured entity or person ("Asegurado", "Empresa").
- supplierCuit: The CUIT of the insured entity.

Analyze the following image:
{{media url=imageDataUri}}

Provide the extracted data in the requested JSON format. If a field is not found, omit it from the response.
`,
});

const extractSupplierDocDataFlow = ai.defineFlow(
    {
        name: 'extractSupplierDocDataFlow',
        inputSchema: ExtractSupplierDocInputSchema,
        outputSchema: SupplierDocDataSchema,
    },
    async (input) => {
        const { output } = await extractSupplierDocDataPrompt(input);
        return output!;
    }
);

export async function extractSupplierDocData(
    imageDataUri: string
): Promise<z.infer<typeof SupplierDocDataSchema>> {
    return await extractSupplierDocDataFlow({ imageDataUri });
}
