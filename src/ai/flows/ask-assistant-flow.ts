'use server';

import { ai } from '@/ai/genkit';
import { getPersonnelInfoTool } from '../tools/get-personnel-info';
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
      tools: [getPersonnelInfoTool],
      system: `Eres un asistente experto para el sistema de gestión de PMD Arquitectura. Tu trabajo es responder las preguntas del usuario utilizando la información disponible. Usa las herramientas que se te proporcionan para buscar datos en el sistema. Sé conciso y directo en tus respuestas. Si la herramienta no devuelve resultados, informa al usuario que no se encontró información para su consulta. Resume los resultados de las herramientas de forma clara y legible para el usuario.`,
      output: {
        format: 'text'
      }
    });

    return { answer: llmResponse.text };
  }
);
