'use server';

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});

const ExcelStructureSchema = z.object({
  headerRowIndex: z.number().describe("The 0-based row index that contains the headers."),
  dataStartRowIndex: z.number().describe("The 0-based row index where actual data begins."),
  nameColumnIndex: z.number().describe("The 0-based column index for Employee/Contractor Name."),
  categoryColumnIndex: z.number().optional().describe("0-based column index for Category/Role."),
  projectColumnIndices: z.array(z.number()).describe("List of 0-based column indices for Projects."),
  dayColumnIndices: z.array(z.object({
    index: z.number(),
    date: z.string().describe("ISO Date string (YYYY-MM-DD) represented by this column.")
  })).describe("Mapping of column indices to the specific dates they represent."),
});

export const analyzeExcelStructure = ai.defineFlow(
  {
    name: "analyzeExcelStructure",
    inputSchema: z.object({
      rows: z.array(z.array(z.any())),
    }),
    outputSchema: ExcelStructureSchema,
  },
  async ({ rows }) => {
    const prompt = `
      You are an expert data analyst. I have a raw Excel sheet (array of arrays).
      I need you to identify the structure to import weekly payments.

      Here are the first 15 rows of the sheet:
      ${JSON.stringify(rows.slice(0, 15), null, 2)}

      Tasks:
      1. Identify which row is the HEADER row (contains 'Nombre', 'Categoria', Project Names, Dates).
      2. Identify the index of the 'Name' column (Employee/Contractor).
      3. Identify the index of the 'Category' column.
      4. Identify columns that look like Projects (Obras) - usually allow monetary input.
      5. Identify columns that represent DAYS/DATES (e.g. 'Lun 01', '01/01', etc). Convert the header text to ISO Date (YYYY-MM-DD). Assume the current year if missing (2026).
      6. Identify where the data starts (usually header row + 1).

      Return the result as a JSON object matching the schema.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      output: { schema: ExcelStructureSchema },
    });

    if (!output) {
      throw new Error("Failed to analyze Excel structure.");
    }

    return output;
  }
);
