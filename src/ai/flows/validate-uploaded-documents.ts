//ValidateUploadedDocuments
'use server';
/**
 * @fileOverview Validates uploaded documents using an LLM to check the document type, file format, and file size.
 *
 * - validateUploadedDocuments - A function that validates the uploaded documents.
 * - ValidateUploadedDocumentsInput - The input type for the validateUploadedDocuments function.
 * - ValidateUploadedDocumentsOutput - The return type for the validateUploadedDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateUploadedDocumentsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A data URI of the document to validate, that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  expectedDocumentType: z.string().describe('The expected type of the document (e.g., Insurance, ART).'),
  expectedFileFormat: z.string().describe('The expected file format of the document (e.g., PDF, JPEG).'),
  maxFileSizeKB: z.number().describe('The maximum allowed file size in KB.'),
});
export type ValidateUploadedDocumentsInput = z.infer<typeof ValidateUploadedDocumentsInputSchema>;

const ValidateUploadedDocumentsOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the document is valid according to the criteria.'),
  validationErrors: z.array(z.string()).describe('A list of validation errors, if any.'),
});
export type ValidateUploadedDocumentsOutput = z.infer<typeof ValidateUploadedDocumentsOutputSchema>;

export async function validateUploadedDocuments(
  input: ValidateUploadedDocumentsInput
): Promise<ValidateUploadedDocumentsOutput> {
  return validateUploadedDocumentsFlow(input);
}

const validateUploadedDocumentsPrompt = ai.definePrompt({
  name: 'validateUploadedDocumentsPrompt',
  input: {schema: ValidateUploadedDocumentsInputSchema},
  output: {schema: ValidateUploadedDocumentsOutputSchema},
  prompt: `You are an expert document validator.

You will receive a document, its expected type, file format, and maximum file size.

You must analyze the document and determine if it meets the specified criteria.

If the document is invalid, provide a list of validation errors.

Document: {{media url=documentDataUri}}
Expected Document Type: {{{expectedDocumentType}}}
Expected File Format: {{{expectedFileFormat}}}
Maximum File Size (KB): {{{maxFileSizeKB}}}

Considerations:
- Check if the document type matches the expected type.
- Check if the file format matches the expected format.
- Check if the file size is within the allowed limit.

Output your determination in JSON format.`,
});

const validateUploadedDocumentsFlow = ai.defineFlow(
  {
    name: 'validateUploadedDocumentsFlow',
    inputSchema: ValidateUploadedDocumentsInputSchema,
    outputSchema: ValidateUploadedDocumentsOutputSchema,
  },
  async input => {
    // Extract the base64 data from the data URI
    const base64Data = input.documentDataUri.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSizeInKB = buffer.length / 1024;

    const validationErrors: string[] = [];

    if (fileSizeInKB > input.maxFileSizeKB) {
      validationErrors.push(
        `File size exceeds the maximum allowed size of ${input.maxFileSizeKB} KB.`
      );
    }

    const {output} = await validateUploadedDocumentsPrompt(input);

    if (validationErrors.length > 0) {
      return {
        isValid: false,
        validationErrors: [...validationErrors, ...(output?.validationErrors || [])],
      };
    }

    return {
      isValid: output?.isValid ?? false,
      validationErrors: output?.validationErrors ?? [],
    };
  }
);
