
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
    Project,
    Employee,
    Contractor
} from '@/lib/types';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
                // Basic sanity check: year between 2000 and 2030
                if (d.getFullYear() < 2000 || d.getFullYear() > 2030) continue;
                return d;
            }
        } catch (e) { }
    }
    return null;
};

// Set max duration for import process
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const exchangeRateStr = formData.get('exchangeRateWeekly') as string;
        const exchangeRateWeekly = exchangeRateStr ? parseFloat(exchangeRateStr) : 1200;

        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        // 1. Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // 2. AI Analysis (on first Sheet)
        if (workbook.SheetNames.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel no tiene hojas.' }, { status: 400 });
        }

        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const firstSheetRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as any[][];

        if (firstSheetRows.length < 5) {
            return NextResponse.json({ error: 'La primera hoja parece vacía. Por favor sube un archivo con datos.' }, { status: 400 });
        }

        // AI Analysis
        // Move init inside try/catch to handle config errors gracefully
        interface AnalysisResult {
            headerRowIndex: number;
            dataStartRowIndex: number;
            nameColumnIndex: number;
            categoryColumnIndex?: number;
            projectColumnIndices: number[];
            dayColumnIndices: { index: number; date: string }[];
        }

        let analysis: AnalysisResult;

        const analysisOverride = formData.get('analysisOverride') as string;

        if (analysisOverride) {
            console.log("[Import] Using Analysis Override provided by client");
            try {
                analysis = JSON.parse(analysisOverride);
            } catch (e) {
                return NextResponse.json({ error: 'Invalid Analysis Override Format' }, { status: 400 });
            }
        } else {
            console.log(`[Import] Starting AI analysis. Rows: ${firstSheetRows.length}.`);
            try {
                // FALLBACK KEY directly in code
                const apiKey = process.env.GOOGLE_GENAI_API_KEY || "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

                if (!apiKey) {
                    throw new Error("GOOGLE_GENAI_API_KEY is missing.");
                }

                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(apiKey);
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
        }

        const {
            headerRowIndex,
            dataStartRowIndex,
            nameColumnIndex,
            categoryColumnIndex,
            projectColumnIndices,
            dayColumnIndices
        } = analysis;

        // 3. Fetch Context
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const employeesSnap = await getDocs(collection(db, 'employees'));
        const contractorsSnap = await getDocs(collection(db, 'contractors'));

        // We'll also need existing weeks to check/create
        // We can't fetch ALL weeks efficiently if many, but let's fetch recent ones or just check per sheet.
        // Optimization: Fetch all weeks for now (usually not that many)
        const weeksSnap = await getDocs(collection(db, 'payrollWeeks'));
        const existingWeeks = weeksSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        const contractors = contractorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contractor));

        const projectMap = new Map(projects.map(p => [normalize(p.name), p.id]));
        const employeeMap = new Map(employees.map(e => [normalize(e.name), e]));
        const contractorMap = new Map(contractors.map(c => [normalize(c.name), c]));

        // Pre-compute Project IDs (from first sheet headers - assuming consistent structure)
        const projectColumnIdMap = new Map<number, { id: string, name: string }>();
        const headerRow = firstSheetRows[headerRowIndex];
        projectColumnIndices.forEach((colIdx: number) => {
            const headerName = headerRow[colIdx]?.toString() || "";
            const pid = projectMap.get(normalize(headerName));
            if (pid) projectColumnIdMap.set(colIdx, { id: pid, name: headerName });
        });

        const createdTotal = { attendance: 0, certifications: 0, fundRequests: 0 };
        const warnings: any[] = [];

        // Collect operations
        const operations: any[] = [];
        let sheetsProcessed = 0;

        // 4. Iterate Sheets
        for (const sheetName of workbook.SheetNames) {
            const sheetDate = parseSheetDate(sheetName);
            if (!sheetDate) {
                warnings.push({ sheet: sheetName, reason: `Nombre de hoja '${sheetName}' no es una fecha válida. Ignorada.` });
                continue;
            }
            sheetsProcessed++;

            const weekStartStr = format(sheetDate, 'yyyy-MM-dd');
            const weekEndObj = addDays(sheetDate, 6); // Weekly assume 7 days
            const weekEndStr = format(weekEndObj, 'yyyy-MM-dd');

            // Find or Create Week
            let weekId = existingWeeks.find(w => w.startDate === weekStartStr)?.id;
            if (!weekId) {
                const newWeekRef = doc(collection(db, 'payrollWeeks'));
                weekId = newWeekRef.id;
                operations.push({
                    type: 'set',
                    ref: newWeekRef,
                    data: {
                        startDate: weekStartStr,
                        endDate: weekEndStr,
                        exchangeRate: exchangeRateWeekly,
                        status: 'Open' // Default
                    }
                });
                existingWeeks.push({ id: weekId, startDate: weekStartStr });
            }

            const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" }) as any[][];

            // Delete Old Data for this Week (Idempotency) -> Need to do this carefully.
            // We can't query and write in same transaction easily if too many docs.
            // We will fetch IDs to delete.
            const collections = ['attendance', 'contractor_certifications', 'fund_requests'];
            for (const colName of collections) {
                const q = query(
                    collection(db, colName),
                    where('date', '>=', weekStartStr),
                    where('date', '<=', weekEndStr),
                    where('source', '==', 'IMPORT')
                );
                const snap = await getDocs(q);
                snap.forEach(d => operations.push({ type: 'delete', ref: d.ref }));
            }

            // Process Rows
            for (let i = dataStartRowIndex; i < sheetRows.length; i++) {
                const row = sheetRows[i];
                if (!row) continue;

                const name = row[nameColumnIndex]?.toString() || "";
                const category = categoryColumnIndex !== undefined ? (row[categoryColumnIndex]?.toString() || "") : "";
                const normalizedName = normalize(name);

                if (!name && !category) continue;
                if (name.toLowerCase().includes('total')) continue;

                const matchedEmployee = employeeMap.get(normalizedName);
                const matchedContractor = contractorMap.get(normalizedName);

                // --- ATTENDANCE ---
                if (matchedEmployee) {
                    // Sort day columns by index once
                    const sortedDayCols = [...dayColumnIndices].sort((a, b) => a.index - b.index);

                    sortedDayCols.forEach((dayCol, dayOffset) => {
                        const cellValue = row[dayCol.index];
                        if (cellValue && cellValue != 0 && cellValue.toString().trim() !== '' && cellValue.toString().trim() !== '-') {
                            // Infer project
                            let projectId = "";
                            const cellStr = cellValue.toString();
                            const pid = projectMap.get(normalize(cellStr));
                            if (pid) projectId = pid;

                            // If we have a project or a valid mark
                            if (projectId || (cellValue && cellValue.toString().trim().length > 0)) {
                                const dateObj = addDays(sheetDate, dayOffset);
                                const dateStr = format(dateObj, 'yyyy-MM-dd');

                                const newRef = doc(collection(db, 'attendance'));
                                operations.push({
                                    type: 'set',
                                    ref: newRef,
                                    data: {
                                        id: newRef.id,
                                        employeeId: matchedEmployee.id,
                                        date: dateStr,
                                        status: 'presente',
                                        projectId: projectId || null, // Allow null project (Unassigned)
                                        payrollWeekId: weekId, // Link to correct week ID
                                        source: 'IMPORT'
                                    }
                                });
                                createdTotal.attendance++;
                            }
                        }
                    });
                }

                // --- MONEY ---
                projectColumnIndices.forEach((colIdx: number) => {
                    const cellValue = row[colIdx];
                    if (typeof cellValue === 'number' && cellValue > 0) {
                        const projectInfo = projectColumnIdMap.get(colIdx);
                        if (!projectInfo) return;

                        const amount = cellValue;
                        if (matchedContractor) {
                            const newRef = doc(collection(db, 'contractor_certifications'));
                            operations.push({
                                type: 'set',
                                ref: newRef,
                                data: {
                                    id: newRef.id,
                                    payrollWeekId: weekId,
                                    contractorId: matchedContractor.id,
                                    contractorName: matchedContractor.name,
                                    projectId: projectInfo.id,
                                    projectName: projectInfo.name,
                                    amount: amount,
                                    currency: 'ARS',
                                    date: weekStartStr,
                                    status: 'Pendiente',
                                    source: 'IMPORT'
                                }
                            });
                            createdTotal.certifications++;
                        } else {
                            const categoryForReq = category || "Materiales";
                            let finalCat = 'Materiales';
                            if (normalize(categoryForReq).includes('flete')) finalCat = 'Logística y PMD';
                            if (normalize(categoryForReq).includes('caja')) finalCat = 'Caja Chica';

                            const newRef = doc(collection(db, 'fund_requests'));
                            operations.push({
                                type: 'set',
                                ref: newRef,
                                data: {
                                    id: newRef.id,
                                    requesterName: 'Importador Excel',
                                    date: weekStartStr,
                                    category: finalCat,
                                    projectId: projectInfo.id,
                                    projectName: projectInfo.name,
                                    amount: amount,
                                    currency: 'ARS',
                                    exchangeRate: exchangeRateWeekly,
                                    status: 'Pendiente',
                                    description: `${name} - ${category}`,
                                    source: 'IMPORT'
                                }
                            });
                            createdTotal.fundRequests++;
                        }
                    }
                });
            }
        }

        // Commit Batches (Chunked)
        const chunkArray = (arr: any[], size: number) => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };
        const chunks = chunkArray(operations, 450);
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(op => {
                if (op.type === 'delete') batch.delete(op.ref);
                if (op.type === 'set') batch.set(op.ref, op.data);
            });
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            created: createdTotal,
            warnings,
            sheetsProcessed
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
