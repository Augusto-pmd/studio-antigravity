
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { addDays, format, parse, isValid } from 'date-fns';

// Helper to normalize strings for matching
const normalize = (str: string) => {
    return str?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
};

// Helper to parse sheet name as date
const parseSheetDate = (sheetName: string): Date | null => {
    // Try formats: dd.mm.yyyy, dd-mm-yyyy, yyyy-mm-dd, dd/MM/yyyy
    const formats = ['dd.MM.yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy', 'd.M.yyyy', 'd-M-yyyy', 'd/M/yyyy'];
    for (const fmt of formats) {
        try {
            const d = parse(sheetName.trim(), fmt, new Date());
            if (isValid(d)) {
                if (d.getFullYear() < 2000 || d.getFullYear() > 2030) continue;
                return d;
            }
        } catch (e) { }
    }
    return null;
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        // 1. Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        if (workbook.SheetNames.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel no tiene hojas.' }, { status: 400 });
        }

        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const firstSheetRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as any[][];

        if (firstSheetRows.length < 5) {
            return NextResponse.json({ error: 'La primera hoja parece vacía. Por favor sube un archivo con datos.' }, { status: 400 });
        }

        // 2. AI Analysis
        interface AnalysisResult {
            headerRowIndex: number;
            dataStartRowIndex: number;
            nameColumnIndex: number;
            categoryColumnIndex?: number;
            projectColumnIndices: number[];
            dayColumnIndices: { index: number; date: string }[];
        }

        let analysis: AnalysisResult;
        // DIRECT HARDCODE TO BYPASS ENV ISSUES
        const DATA_API_KEY = "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

        console.log(`[Import Preview] Starting analysis. Rows: ${firstSheetRows.length}. Key available (hardcoded).`);

        try {
            if (!DATA_API_KEY) {
                // This should never happen now
                throw new Error("GOOGLE_GENAI_API_KEY is missing (unexpected).");
            }

            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(DATA_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

            const prompt = `
            You are an expert data analyst. I have a raw Excel sheet (array of arrays).
            I need you to identify the structure to import weekly payments.

            Here are the first 15 rows of the sheet:
            ${JSON.stringify(firstSheetRows.slice(0, 15), null, 2)}

            Tasks:
            1. Identify which row is the HEADER row (contains 'Nombre', 'Categoria', Project Names, Dates).
            2. Identify the index of the 'Name' column (Employee/Contractor).
            3. Identify the index of the 'Category' column.
            4. Identify columns that look like Projects (Obras) - usually allow monetary input.
            5. Identify columns that represent DAYS/DATES (e.g. 'Lun 01', '01/01', etc). Convert the header text to ISO Date (YYYY-MM-DD). Assume the current year if missing (2026).
            6. Identify where the data starts (usually header row + 1).

            Return the result as a JSON object with this schema:
            {
                "headerRowIndex": number,
                "dataStartRowIndex": number,
                "nameColumnIndex": number,
                "categoryColumnIndex": number (optional),
                "projectColumnIndices": number[],
                "dayColumnIndices": [ { "index": number, "date": "YYYY-MM-DD" } ]
            }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            analysis = JSON.parse(responseText) as AnalysisResult;
        } catch (e: any) {
            console.error("AI Analysis Failed:", e);
            const msg = e.message || e.toString();
            if (msg.includes("API key") || msg.includes("GOOGLE_GENAI_API_KEY") || msg.includes("FAILED_PRECONDITION")) {
                return NextResponse.json({ error: 'Configuration Error: Missing Google GenAI API Key. Please notify the administrator.' }, { status: 500 });
            }
            return NextResponse.json({ error: `AI Analysis Error: ${msg}` }, { status: 500 });
        }

        // 3. Prepare Preview Data
        const sheetsStatus = workbook.SheetNames.map(name => {
            const date = parseSheetDate(name);
            return {
                name,
                validDate: !!date,
                parsedDate: date ? format(date, 'yyyy-MM-dd') : null
            };
        });

        // Return Analysis + Sample Data + Sheet Info
        return NextResponse.json({
            success: true,
            analysis,
            sheets: sheetsStatus,
            sampleRows: firstSheetRows.slice(analysis.headerRowIndex, analysis.headerRowIndex + 10) // Return header + 10 rows
        });

    } catch (error: any) {
        console.error('Import Preview Error:', error);

        // Return 200 to prevent Cloud Functions/Next.js from serving a static 500 HTML page
        // which causes "Unexpected token I" in JSON.parse
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown Error',
            diagnostics: {
                hasApiKey: true, // We are using a hardcoded key now
                envKeys: Object.keys(process.env).filter(k => k.startsWith('GOOG')),
                errorType: error.name,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        }, { status: 200 }); // Intentional 200
    }
}
