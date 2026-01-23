'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Employee, Contractor, TechnicalOfficeEmployee } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

async function findPersonnel({ name }: { name: string }) {
  // NOTE: Firebase queries have been temporarily disabled in this server-side tool
  // to resolve a critical stability issue caused by using the client SDK in a server environment.
  // This function will return a message indicating the feature is disabled.
  return {
    results: [
      {
        name: `Búsqueda para "${name}"`,
        type: 'Sistema',
        details: {
          Aviso:
            'La búsqueda de personal está temporalmente desactivada para resolver un problema de estabilidad de la aplicación. Esta función será restaurada pronto.',
        },
      },
    ],
  };
}

export const getPersonnelInfoTool = ai.defineTool(
  {
    name: 'getPersonnelInfo',
    description: 'Busca información sobre empleados o contratistas, incluyendo el estado de su documentación (ART, seguros, etc).',
    inputSchema: z.object({
      name: z.string().describe('El nombre de la persona o empresa a buscar.'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        name: z.string(),
        type: z.string().describe('El tipo de entidad (ej. Empleado, Contratista).'),
        details: z.record(z.any()).describe('Un objeto con los detalles encontrados.'),
      })),
    }),
  },
  async ({ name }) => {
    return await findPersonnel({ name });
  }
);
