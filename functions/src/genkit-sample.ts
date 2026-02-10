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

// ESTA ES LA HERRAMIENTA QUE LE DA "OJOS"
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

const SYSTEM_PROMPT = `
Eres el Arquitecto Senior de PMD.
Tienes permiso para usar la herramienta 'getPayrollData' para verificar el estado real de las colecciones antes de dar una recomendación.

REGLAS DE INTEGRIDAD:
1.  Formato de Fecha: Todas las fechas, especialmente 'startDate' y 'endDate' en 'payrollWeeks', DEBEN estar en formato ISO 8601. Si encuentras un formato inválido, repórtalo como un error crítico.
2.  Vinculación: Si detectas que falta un payrollWeekId en 'attendances', debes reportarlo como un error crítico de integridad.
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
      tools: [getPayrollData], // Le pasamos la herramienta aquí
    });
    return text;
  }
);
