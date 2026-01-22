"use server";
import { validateUploadedDocuments } from '@/ai/flows/validate-uploaded-documents';

export async function validateDocumentAction(dataUri: string, fileType: string, fileSize: number) {
  try {
    if (!dataUri) {
        return { isValid: false, validationErrors: ['No se ha proporcionado ningún archivo.'] };
    }

    const maxFileSizeKB = 5 * 1024; // 5 MB

    if ((fileSize / 1024) > maxFileSizeKB) {
        return { isValid: false, validationErrors: [`El archivo es demasiado grande. El tamaño máximo es de ${maxFileSizeKB/1024} MB.`] };
    }

    const result = await validateUploadedDocuments({
      documentDataUri: dataUri,
      expectedDocumentType: 'Comprobante de gasto',
      expectedFileFormat: 'PDF, JPG, PNG, HEIC',
      maxFileSizeKB: maxFileSizeKB,
    });
    
    return result;

  } catch (error) {
    console.error("Error validating document:", error);
    return { isValid: false, validationErrors: ['Ocurrió un error inesperado al validar el documento.'] };
  }
}
