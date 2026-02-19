'use server';

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash', // Upgraded model
});

interface AnalysisInput {
    transactions: any[];
    userQuery: string;
}

const AnalysisSchema = z.object({
    answer: z.string(),
    suggestedActions: z.array(z.string()).optional(),
});

export const analyzeTreasuryPatterns = ai.defineFlow(
    {
        name: "analyzeTreasuryPatterns",
        inputSchema: z.object({
            transactions: z.array(z.any()),
            userQuery: z.string(),
        }),
        outputSchema: AnalysisSchema,
    },
    async ({ transactions, userQuery }) => {
        // 1. Optimize Context (Token Limit)
        // Map relevant fields only to save tokens
        const contextData = transactions.slice(0, 500).map(tx => ({
            date: tx.date,
            type: tx.type, // Ingreso/Egreso
            category: tx.category,
            amount: tx.amount,
            description: tx.description,
            project: tx.projectName || 'Sin Obra'
        }));

        const prompt = `
      You are an expert Financial Assistant for a Construction Company.
      
      Your goal is to answer the User Query based ONLY on the provided Transaction Data.
      
      User Query: "${userQuery}"

      Transaction Data (Last 500 records):
      ${JSON.stringify(contextData)}

      Instructions:
      - Analyze the data to find patterns or calculate totals requested.
      - If the user asks for "nafta", look for "Combustible", "YPF", "Shell", "Axion".
      - Provide a concise, helpful answer in Spanish.
      - If you calculate a total, mention the currency (assume ARS unless specified).
      - If you see a concerning pattern (e.g. costs rising), mention it.

      Return the result as a JSON object with:
      - answer: The natural language response in Markdown.
      - suggestedActions: Optional short list of follow-up questions or actions.
    `;

        const { output } = await ai.generate({
            prompt: prompt,
            output: { schema: AnalysisSchema },
        });

        if (!output) {
            throw new Error("Failed to generate analysis.");
        }

        return output;
    }
);
