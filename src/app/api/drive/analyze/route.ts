import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/google-drive';
import * as XLSX from 'xlsx';
// pdf-parse is a CommonJS module, better to require it
const pdfParse = require('pdf-parse');

export async function POST(req: NextRequest) {
    try {
        const { fileId, fileName, mimeType, prompt } = await req.json();

        if (!fileId || !prompt) {
            return NextResponse.json({ error: 'Missing fileId or prompt' }, { status: 400 });
        }

        // 1. Get File Stream
        const stream = await getFileStream(fileId);

        // Convert stream to buffer
        const chunks: any[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // 2. Extract Text
        let textContent = '';

        if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(buffer);
            textContent = pdfData.text;
        } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || fileName.endsWith('.xlsx')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            textContent = XLSX.utils.sheet_to_csv(sheet);
        } else {
            // Assume text
            textContent = buffer.toString('utf-8');
        }

        // Truncate if too long (Gemini Flash has ~1M context, but let's be safe/fast)
        if (textContent.length > 50000) {
            textContent = textContent.substring(0, 50000) + '...[TRUNCATED]';
        }

        // 3. Call Gemini
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        // DIRECT HARDCODE TO BYPASS ENV ISSUES
        const DATA_API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";
        const genAI = new GoogleGenerativeAI(DATA_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const fullPrompt = `
        Context: You are an intelligent assistant analyzing a corporate document.
        Document Name: ${fileName}
        Document Content:
        """
        ${textContent}
        """

        User Question: ${prompt}

        Instructions:
        - Answer based ONLY on the provided document content.
        - If the answer is not in the document, say so.
        - Be concise and professional.
        - Format the answer in Markdown.
        `;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        return NextResponse.json({ answer: responseText });

    } catch (error: any) {
        console.error('AI Analyze Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze file' },
            { status: 500 }
        );
    }
}
