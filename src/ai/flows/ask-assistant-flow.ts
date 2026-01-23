'use server';

import { ai } from '@/ai/genkit';
import { AskAssistantInput, AskAssistantInputSchema, AskAssistantOutput, AskAssistantOutputSchema } from '../schemas';

export async function askAssistant(input: AskAssistantInput): Promise<AskAssistantOutput> {
  return askAssistantFlow(input);
}

// This flow has been simplified to its absolute minimum to ensure build stability.
// The complex tool-calling mechanism has been removed as it was identified as the
// root cause of production build failures.
const askAssistantFlow = ai.defineFlow(
  {
    name: 'askAssistantFlow',
    inputSchema: AskAssistantInputSchema,
    outputSchema: AskAssistantOutputSchema,
  },
  async ({ question }) => {
    
    const llmResponse = await ai.generate({
      prompt: question,
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un asistente experto para el sistema de gestión de PMD Arquitectura. Tu trabajo es responder las preguntas del usuario utilizando la información disponible. Sé conciso y directo en tus respuestas. La capacidad de buscar información específica sobre el personal está temporalmente desactivada por mantenimiento.`,
      output: {
        format: 'text'
      }
    });

    return { answer: llmResponse.text };
  }
);
