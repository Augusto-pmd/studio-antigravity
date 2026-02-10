/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onFlow} from "@genkit-ai/firebase/functions";

// Logic from genkit-sample.ts
import {genkit, z} from "genkit";
import {vertexAI, gemini15Pro} from "@genkit-ai/vertexai";
import * as admin from "firebase-admin";
import * as fs from "fs";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const ai = genkit({
  plugins: [vertexAI({location: "us-central1"})],
  model: gemini15Pro,
});

const SYSTEM_PROMPT = "Eres el Arquitecto de PMD. Reglas: payrollWeeks " +
  "solo id/startDate/endDate. Gastos con projectId y payrollWeekId.";

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

const pmdAssistant = ai.defineFlow(
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

// Original index.ts content
setGlobalOptions({maxInstances: 10});

export const pmdAssistantFlow = onFlow(
    {
        name: "pmdAssistant",
        flow: pmdAssistant,
        authPolicy: (user) => {
            if (!user) {
                throw new Error("Solo usuarios autenticados pueden usar este asistente.");
            }
        },
    },
);
