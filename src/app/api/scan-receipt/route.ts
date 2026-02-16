
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ReceiptSchema = z.object({
    date: z.string().describe('Date of the receipt in YYYY-MM-DD format'),
    supplierName: z.string().describe('Name of the supplier or vendor'),
    supplierCuit: z.string().optional().describe('CUIT of the supplier if available'),
    amount: z.number().describe('Total amount of the receipt'),
    currency: z.enum(['ARS', 'USD']).optional().describe('Currency of the receipt, default to ARS'),
    invoiceNumber: z.string().optional().describe('Invoice number or receipt number'),
    category: z.string().optional().describe('Category of the expense (e.g., Materiales, Mano de Obra, Combustible)'),
    items: z.array(z.object({
        description: z.string(),
        amount: z.number()
    })).optional().describe('Line items if available')
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');
        const dataUri = `data:${file.type};base64,${base64Image}`;


        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

        const prompt = `
        Analyze this receipt/invoice and extract the following data:
        - Date (YYYY-MM-DD)
        - Supplier Name
        - Supplier CUIT (if visible)
        - Total Amount (number)
        - Currency (ARS or USD)
        - Invoice Number (Point of Sale + Number)
        - Category (e.g., Materiales, Mano de Obra, Combustible)
        - Items (array of object with description and amount)

        Return the result as a JSON object matching this schema:
        {
            "date": "YYYY-MM-DD",
            "supplierName": "string",
            "supplierCuit": "string",
            "amount": number,
            "currency": "ARS" | "USD",
            "invoiceNumber": "string",
            "category": "string",
            "items": [ { "description": "string", "amount": number } ]
        }
        `;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: file.type
                }
            }
        ];

        let output;
        try {
            const result = await model.generateContent([prompt, ...imageParts]);
            const responseText = result.response.text();
            output = JSON.parse(responseText);
        } catch (e: any) {
            console.error("AI Analysis Failed:", e);
            return NextResponse.json({ error: `Error analysing receipt with AI: ${e.message}` }, { status: 500 });
        }

        if (!output) {
            return NextResponse.json({ error: 'Failed to extract data' }, { status: 500 });
        }

        return NextResponse.json(output);

    } catch (error: any) {
        console.error('Error processing receipt:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
