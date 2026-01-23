'use server';

import { ai } from '@/ai/genkit';
import { AskAssistantInput, AskAssistantInputSchema, AskAssistantOutput, AskAssistantOutputSchema } from '../schemas';

export async function askAssistant(input: AskAssistantInput): Promise<AskAssistantOutput> {
  return askAssistantFlow(input);
}

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
      // La herramienta 'getPersonnelInfoTool' ha sido eliminada para estabilizar el proceso de compilación.
      // Su compleja estructura causaba fallos en el servidor de producción.
      system: `Eres un asistente experto para el sistema de gestión de PMD Arquitectura. Tu trabajo es responder las preguntas del usuario utilizando la información disponible. Sé conciso y directo en tus respuestas.`,
      output: {
        format: 'text'
      }
    });

    return { answer: llmResponse.text };
  }
);
