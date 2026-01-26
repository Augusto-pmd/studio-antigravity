'use server';
/**
 * @fileOverview An AI assistant flow to answer user questions about the app.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AskAssistantInputSchema = z.object({
  question: z.string().describe('The user\'s question about the application.'),
  userRole: z.string().describe('The role of the user asking the question (e.g., "Dirección", "Operador").'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The history of the conversation so far.'),
});

export type AskAssistantInput = z.infer<typeof AskAssistantInputSchema>;

export const AskAssistantOutputSchema = z.object({
  answer: z.string().describe('The AI assistant\'s answer to the user\'s question.'),
});

export type AskAssistantOutput = z.infer<typeof AskAssistantOutputSchema>;

export async function askAssistant(input: AskAssistantInput): Promise<AskAssistantOutput> {
  return askAssistantFlow(input);
}

const assistantPrompt = ai.definePrompt(
  {
    name: 'askAssistantPrompt',
    input: { schema: AskAssistantInputSchema },
    output: { schema: AskAssistantOutputSchema },
    prompt: `Eres un asistente experto para la aplicación "PMD Manager", un sistema de gestión integral para una empresa de construcción. Tu objetivo es guiar a los usuarios y responder sus preguntas sobre cómo usar la aplicación.

    El usuario actual tiene el rol de: {{{userRole}}}. Adapta tus respuestas a lo que un usuario con este rol podría necesitar.

    Aquí hay un resumen de los módulos de la aplicación:
    - Dashboard: Vista general con estadísticas clave (solo para Dirección y Supervisores).
    - Obras: Crear, ver y gestionar todos los proyectos de construcción.
    - Gastos por Obra: Registrar y consultar gastos específicos de cada obra.
    - Mi Caja: Gestionar el efectivo personal, registrar gastos rápidos y ver el saldo.
    - Asistencias: Pasar lista a los empleados de obra y gestionar adelantos.
    - Pago Semanal: Solicitar fondos para gastos de la semana.
    - Pedidos y Alertas: Crear y seguir tareas asignadas a otros miembros del equipo.
    - Mis Horas: Cargar las horas trabajadas por día en cada proyecto (para personal de oficina técnica).
    - Proveedores: Gestionar el listado de proveedores de materiales y servicios.
    - Empleados: Gestionar el personal de obra.
    - Contratistas: Gestionar contratistas de servicios.
    - Activos: Administrar los activos de la compañía (vehículos, maquinaria, etc.).
    - Contabilidad: Módulo para análisis contable con resúmenes de IVA, IIBB y reportes.
    - Recursos Humanos: (Admin) Gestión de salarios del personal de oficina técnica.
    - Tesorería: (Admin) Gestión de las cuentas bancarias y de efectivo centrales de la empresa.
    - Gestión de Cajas: (Admin) Supervisar las cajas de efectivo de todos los usuarios.
    - Usuarios: (Admin) Gestionar los usuarios del sistema y sus roles.

    Sé conciso, amigable y directo. Responde en el contexto de la aplicación PMD Manager. No inventes funcionalidades que no existen.

    Historial de la Conversación:
    {{#if conversationHistory}}
      {{#each conversationHistory}}
        {{#if (eq role 'user')}}
          Usuario: {{{content}}}
        {{else}}
          Asistente: {{{content}}}
        {{/if}}
      {{/each}}
    {{/if}}

    Pregunta del Usuario:
    {{{question}}}
    `,
  }
);


const askAssistantFlow = ai.defineFlow(
  {
    name: 'askAssistantFlow',
    inputSchema: AskAssistantInputSchema,
    outputSchema: AskAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await assistantPrompt(input);
    if (!output) {
      throw new Error("El asistente no pudo generar una respuesta.");
    }
    return output;
  }
);
