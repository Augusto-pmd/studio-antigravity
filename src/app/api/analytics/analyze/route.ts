
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { data } = await req.json();

        // DIRECT HARDCODE TO BYPASS ENV ISSUES
        const DATA_API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

        if (!DATA_API_KEY) {
            return NextResponse.json({ text: "Error: API Key no configurada." }, { status: 500 });
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(DATA_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Actúa como un analista financiero experto en construcción y arquitectura.
        Analiza los siguientes datos de obras (Ingresos, Costos, ROI):
        ${JSON.stringify(data, null, 2)}

        1. Identifica qué obras tienen el peor rendimiento (ROI bajo o negativo) y sugiere posibles causas (ej. costos descontrolados).
        2. Felicita las obras de alto rendimiento.
        3. Da una recomendación general de 1 frase para la gerencia.

        Usa formato markdown simple, sé conciso y profesional.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });

    } catch (e: any) {
        console.error("AI Analysis Error:", e);
        return NextResponse.json({ text: "Error analizando datos." }, { status: 500 });
    }
}
