'use server';
import { genkit, z } from "genkit";
import { vertexAI, gemini25Pro } from "@genkit-ai/vertexai";

const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1' })],
  model: gemini25Pro,
});

const SYSTEM_PROMPT = ` Eres el Arquitecto Senior de PMD Arquitectura V2. TU PRIORIDAD ABSOLUTA: La Integridad del Ciclo Semanal (Payroll).

COLECCIONES Y ESQUEMAS:

attendances: { payrollWeekId, workerId, dias_trabajados }.

payrollWeeks: { id, startDate, endDate }. ¡PROHIBIDO añadir campos extra como "status"!

cashAdvances: { monto, fecha, motivo, payrollWeekId }.

projects: { nombre, ubicacion, avance, presupuesto }.

users: { nombre, email, rol, area }.

REGLAS SAGRADAS DE PMD:

VINCULACIÓN: Todo 'attendance' y 'cashAdvance' DEBE estar vinculado a un 'payrollWeekId'.

INTEGRIDAD FINANCIERA: Un error en el payrollWeekId rompe la caja. Sé estricto con los tipos.

SEGURIDAD: Nunca sugieras borrar (delete) datos. Sugiere marcar como 'anulados'. `;

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
    });
    return text;
  }
);
