'use server';
import { genkit, z } from "genkit";
import { vertexAI, gemini25Pro } from "@genkit-ai/vertexai";
import * as admin from "firebase-admin";

// Inicializamos Firebase Admin si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1' })],
  model: gemini25Pro,
});

// Herramienta 1: Consulta de datos generales
const getPayrollData = ai.defineTool(
  {
    name: "getPayrollData",
    description: "Consulta las semanas de pago y asistencias en Firestore para analizar el estado del sistema.",
    inputSchema: z.object({ collection: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const snapshot = await admin.firestore().collection(input.collection).limit(10).get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }
);

// Herramienta 2: Verificación de integridad referencial
const checkSystemIntegrity = ai.defineTool(
  {
    name: "checkSystemIntegrity",
    description: "Verifica que todos los registros de 'attendances' estén vinculados a un 'payrollWeekId' válido y existente en la colección 'payrollWeeks'.",
    inputSchema: z.object({}), // No necesita input
    outputSchema: z.object({
      orphanCount: z.number(),
      message: z.string(),
    }),
  },
  async () => {
    const db = admin.firestore();
    
    // 1. Obtener todos los IDs de payrollWeeks
    const weeksSnapshot = await db.collection('payrollWeeks').get();
    const validWeekIds = new Set(weeksSnapshot.docs.map(doc => doc.id));

    // 2. Revisar la colección attendances
    const attendancesSnapshot = await db.collection('attendances').get();
    let orphanCount = 0;
    
    attendancesSnapshot.forEach(doc => {
      const attendanceData = doc.data();
      if (!attendanceData.payrollWeekId || !validWeekIds.has(attendanceData.payrollWeekId)) {
        orphanCount++;
      }
    });

    // 3. Devolver reporte
    return {
      orphanCount,
      message: orphanCount > 0
        ? `Se encontraron ${orphanCount} registros de asistencia huérfanos (sin un payrollWeekId válido).`
        : "La integridad del sistema está verificada. Todos los registros de asistencia están correctamente vinculados."
    };
  }
);


const SYSTEM_PROMPT = `
Eres el Arquitecto Senior de PMD.
Tienes acceso a dos herramientas para diagnosticar el sistema:
1. 'getPayrollData': Para inspeccionar datos de una colección específica. Úsala para revisiones rápidas.
2. 'checkSystemIntegrity': Para realizar una auditoría completa de la vinculación entre 'attendances' y 'payrollWeeks'. Úsala cuando el usuario te pida explícitamente "verificar la integridad", "revisar registros huérfanos" o un análisis de consistencia de datos.

REGLAS DE INTEGRIDAD:
1.  Formato de Fecha: Todas las fechas, especialmente 'startDate' y 'endDate' en 'payrollWeeks', DEBEN estar en formato ISO 8601. Si encuentras un formato inválido, repórtalo como un error crítico.
2.  Vinculación Semanal: Si detectas que falta un payrollWeekId en 'attendances', debes reportarlo como un error crítico de integridad.
3.  Vinculación a Obra: Todo gasto (asistencia o adelanto) DEBE contener un projectId válido. Si detectas un registro sin projectId, debes marcarlo como 'Gasto Huérfano' y excluirlo de los totales de obra hasta que sea asignado.
`;

export const pmdAssistant = ai.defineFlow(
  {
    name: "pmdAssistant",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await ai.generate({
      system: SYSTEM_PROMPT,
      prompt: input,
      tools: [getPayrollData, checkSystemIntegrity], // Le pasamos AMBAS herramientas
    });
    return text;
  }
);
