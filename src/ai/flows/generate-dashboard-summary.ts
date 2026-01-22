'use server';
/**
 * @fileOverview Generates a natural language summary for the main dashboard.
 *
 * - generateDashboardSummary - A function that analyzes project data and returns a textual summary.
 */

import {ai} from '@/ai/genkit';
import {
  DashboardSummaryInput,
  DashboardSummaryInputSchema,
  DashboardSummaryOutput,
  DashboardSummaryOutputSchema,
} from '@/ai/schemas';

export async function generateDashboardSummary(input: DashboardSummaryInput): Promise<DashboardSummaryOutput> {
  return generateDashboardSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dashboardSummaryPrompt',
  input: {schema: DashboardSummaryInputSchema},
  output: {schema: DashboardSummaryOutputSchema},
  prompt: `Eres un asistente de dirección para una empresa constructora en Argentina.
Tu tarea es analizar los siguientes datos y redactar un breve resumen ejecutivo para el dashboard principal.
Sé conciso y directo. Destaca los puntos más importantes. El resumen no debe exceder las 4 oraciones.
Utiliza formato Markdown simple (negrita) para resaltar cifras o datos clave.

Datos actuales:
- Obras en curso: **{{{stats.obrasEnCurso}}}**
- Saldo total de contratos: **{{{stats.saldoContratos}}}**
- Gastos del mes: **{{{stats.gastosMes}}}**

Proyectos activos destacados:
{{#each activeProjects}}
- **{{name}}**: {{progress}}% completado, supervisado por {{supervisor}}.
{{/each}}

Tareas pendientes urgentes:
{{#if pendingTasks}}
{{#each pendingTasks}}
- "{{title}}" asignada a {{assigneeName}}.
{{/each}}
{{else}}
- No hay tareas pendientes urgentes.
{{/if}}

Genera el resumen basado en esta información.
`,
});

const generateDashboardSummaryFlow = ai.defineFlow(
  {
    name: 'generateDashboardSummaryFlow',
    inputSchema: DashboardSummaryInputSchema,
    outputSchema: DashboardSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
