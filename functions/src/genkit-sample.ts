
import {genkit, z} from "genkit";
import {vertexAI, gemini25Pro} from "@genkit-ai/vertexai";
import * as admin from "firebase-admin";
import * as fs from "fs";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ai = genkit({
  plugins: [vertexAI({location: "us-central1"})],
  model: gemini25Pro,
});

const SYSTEM_PROMPT = `
Eres el Arquitecto Senior de PMD.
REGLAS:
1. payrollWeeks: solo id, startDate, endDate.
2. Todo gasto requiere projectId y payrollWeekId.
3. No borrar, solo anular.
`;

export const analyzeDeployError = ai.defineTool(
  {
    name: "analyzeDeployError",
    description: "Lee el log de error de despliegue.",
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async () => {
    try {
      const log = fs.readFileSync("../firebase-debug.log", "utf8");
      return log.split("\n").slice(-50).join("\n");
    } catch (e) {
      return "No se encontró el log.";
    }
  }
);

export const pmdAssistant = ai.defineFlow(
  {
    name: "pmdAssistant",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (input) => {
    const {text} = await ai.generate({
      system: SYSTEM_PROMPT,
      prompt: input,
      tools: [analyzeDeployError],
    });
    return text;
  }
);
