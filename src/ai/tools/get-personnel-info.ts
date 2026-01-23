'use server';

import { ai } from '@/ai/genkit';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { z } from 'genkit';
import type { Employee, Contractor, TechnicalOfficeEmployee } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function safeFormatDate(dateString?: string) {
    if (!dateString) return 'No especificado';
    try {
        return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch (e) {
        return 'Fecha inválida';
    }
}

async function findPersonnel({ name }: { name: string }) {
  const { firestore } = initializeFirebase();
  const results: any[] = [];
  const nameLower = name.toLowerCase();

  const searchInCollection = async (collectionName: string, nameField: string, type: string, detailsBuilder: (doc: any) => object) => {
    try {
        const ref = collection(firestore, collectionName);
        const snapshot = await getDocs(ref);
        snapshot.forEach(doc => {
        const data = doc.data();
        if (data[nameField] && data[nameField].toLowerCase().includes(nameLower)) {
            results.push({
            name: data[nameField],
            type: type,
            details: detailsBuilder(data)
            });
        }
        });
    } catch(e) {
        // May fail due to security rules if not admin, we can ignore.
        console.warn(`Could not search in collection ${collectionName}:`, e);
    }
  };

  await searchInCollection('employees', 'name', 'Empleado de Obra', (e: Employee) => ({
    Estado: e.status,
    'Vencimiento ART': safeFormatDate(e.artExpiryDate),
  }));

  await searchInCollection('technicalOfficeEmployees', 'fullName', 'Empleado de Oficina', (e: TechnicalOfficeEmployee) => ({
    Estado: e.status,
    Cargo: e.position,
    'Salario Mensual': e.monthlySalary, // Note: This might be sensitive data
  }));
  
  await searchInCollection('contractors', 'name', 'Contratista', (c: Contractor) => ({
    Estado: c.status,
    'Vencimiento ART': safeFormatDate(c.artExpiryDate),
    'Vencimiento Seguro': safeFormatDate(c.insuranceExpiryDate),
  }));
  
  return { results };
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
