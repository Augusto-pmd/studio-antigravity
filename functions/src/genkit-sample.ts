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

const calculateProjectExpenses = ai.defineTool(
  {
    name: "calculateProjectExpenses",
    description: "Suma nómina y adelantos de una obra específica.",
    inputSchema: z.object({ projectId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const db = admin.firestore();
    
    // 1. Fetch employees to get their daily wages
    const employeesSnapshot = await db.collection('employees').get();
    const employeeWages = new Map<string, number>();
    employeesSnapshot.forEach(doc => {
      employeeWages.set(doc.id, doc.data().dailyWage || 0);
    });

    let total = 0;

    // 2. Calculate total from attendances
    const atts = await db.collection('attendances').where('projectId', '==', input.projectId).get();
    atts.forEach(doc => {
      const data = doc.data();
      if (data.status === 'presente') {
        const wage = employeeWages.get(data.employeeId) || 0;
        total += wage;
      }
    });

    // 3. Calculate total from cash advances
    const ads = await db.collection('cashAdvances').where('projectId', '==', input.projectId).get();
    ads.forEach(d => {
      total += (d.data().amount || 0);
    });

    return { totalGasto: total, detalle: 'Cálculo de nómina (jornales) + adelantos.' };
  }
);


const SYSTEM_PROMPT = `
Eres el Arquitecto Senior de PMD.
Tienes acceso a herramientas para diagnosticar el sistema. Úsalas para verificar el estado real de las colecciones antes de dar una recomendación.

REGLAS DE INTEGRIDAD:
1.  Formato de Fecha: Todas las fechas, especialmente 'startDate' y 'endDate' en 'payrollWeeks', DEBEN estar en formato ISO 8601. Si encuentras un formato inválido, repórtalo como un error crítico.
2.  Vinculación Semanal: Si detectas que falta un payrollWeekId en 'attendances', debes reportarlo como un error crítico de integridad.
3.  Vinculación a Obra: Todo gasto (asistencia o adelanto) DEBE contener un projectId válido. Si detectas un registro sin projectId, debes marcarlo como 'Gasto Huérfano' y excluirlo de los totales de obra hasta que sea asignado.
4.  REGLA DE ORO GASTOS: Ningún gasto se considera válido si no tiene AMBOS: projectId y payrollWeekId.
5.  AUDITORÍA: Si el usuario pregunta por gastos, usa la herramienta para calcular el total y luego busca manualmente si hay registros que tengan el projectId pero les falte el payrollWeekId (gastos en el aire).
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
      tools: [getPayrollData, checkSystemIntegrity, calculateProjectExpenses],
    });
    return text;
  }
);
