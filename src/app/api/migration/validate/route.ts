import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { IMPORT_SCHEMAS, ImportModuleType } from '@/lib/import-schemas';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

// Helper: Normalize strings for fuzzy matching
const normalize = (str: string) => str?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

// Set max duration to 60 seconds for AI processing
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const moduleId = formData.get('moduleId') as ImportModuleType;
        const analysisOverride = formData.get('analysis') as string;

        if (!file || !moduleId) {
            return NextResponse.json({ error: 'Missing file or moduleId' }, { status: 400 });
        }

        const schema = IMPORT_SCHEMAS[moduleId];
        if (!schema) {
            return NextResponse.json({ error: 'Invalid Module ID' }, { status: 400 });
        }

        // 1. Read Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" }) as any[][];

        // 2. AI Analysis (if not provided/overridden)
        // NOTE: For now, we will reuse the logic from the specific route or move it here. 
        // To keep this "perfected" engine clean, we should really call the AI here if needed.
        // For this step, I will Assume the frontend MIGHT pass an analysis if it ran a pre-check, 
        // but typically the backend does it. 
        // Let's implement the AI call here, customized by schema.prompt.

        let analysis = null;
        if (analysisOverride) {
            try {
                analysis = JSON.parse(analysisOverride);
            } catch (e) {
                console.warn("Invalid analysis override JSON", e);
            }
        }

        if (!analysis) {
            // FALLBACK KEY directly in code to avoid Env Var stripping issues in some cloud environments
            const apiKey = process.env.GOOGLE_GENAI_API_KEY || "AIzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A";

            if (!apiKey) {
                return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
            }
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

            const prompt = `
            ${schema.aiPromptContext}
            
            Analyze these first 10 rows:
            ${JSON.stringify(rows.slice(0, 10), null, 2)}

            Return JSON:
            {
                "headerRowIndex": number,
                "dataStartRowIndex": number,
                "mappings": {
                    // Map schema keys to column indices (0-based)
                    // Example: "name": 1, "quantity": 4
                    ${schema.requiredColumns.map(c => `"${c.key}": number | number[]`).join(',\n')}
                }
            }
            `;

            const result = await model.generateContent(prompt);
            analysis = JSON.parse(result.response.text());
        }

        // 3. Entity Checking
        // We need to identify what entities need checking based on the module.
        // WEEKLY_PAYMENT -> Projects, Employees, Contractors
        // EXPENSES -> Suppliers, Projects
        // STOCK -> Categories? (Usually stock items are new or exist)

        const missingEntities: Record<string, string[]> = {};

        // Helper to check DB
        const checkDB = async (collectionName: string, names: Set<string>) => {
            if (names.size === 0) return [];
            const snap = await getDocs(collection(db, collectionName));
            // Create a set of normalized existing names
            const existing = new Set(snap.docs.map(d => normalize(d.data().name || "")));
            const missing: string[] = [];
            names.forEach(n => {
                if (!existing.has(normalize(n))) missing.push(n);
            });
            return missing;
        };

        if (moduleId === 'WEEKLY_PAYMENT') {
            const projectCols = Array.isArray(analysis.mappings.projects) ? analysis.mappings.projects : [analysis.mappings.projects];

            // Extract Project Names from Header
            const headerRow = rows[analysis.headerRowIndex];
            const projectNames = new Set<string>();
            projectCols.forEach((idx: number) => {
                if (headerRow[idx]) projectNames.add(headerRow[idx].toString().trim());
            });

            missingEntities['projects'] = await checkDB('projects', projectNames);

            // Extract People Names from Data
            // This is harder because there are many rows. 
            // We might skip this for now to keep it fast, or check only unique names.
            const nameCol = analysis.mappings.name;
            const personNames = new Set<string>();
            for (let i = analysis.dataStartRowIndex; i < rows.length; i++) {
                const name = rows[i][nameCol]?.toString().trim();
                // Basic cleanup
                if (name && !name.toLowerCase().includes('total')) personNames.add(name);
            }

            // For people, we check both employees and contractors
            const missingPeople = await checkDB('employees', personNames);
            const missingContractors = await checkDB('contractors', new Set(missingPeople)); // If not in employees, check contractors? 
            // Actually, if it's missing in employees, it might be a contractor. 
            // Simplification: We will flag it as "Unknown Person" if not in either.

            const realMissingPeople: string[] = [];
            const empSnap = await getDocs(collection(db, 'employees'));
            const contSnap = await getDocs(collection(db, 'contractors'));
            const allPeople = new Set([
                ...empSnap.docs.map(d => normalize(d.data().name)),
                ...contSnap.docs.map(d => normalize(d.data().name))
            ]);

            personNames.forEach(n => {
                if (!allPeople.has(normalize(n))) realMissingPeople.push(n);
            });

            missingEntities['people'] = realMissingPeople;
        }

        return NextResponse.json({
            success: true,
            analysis,
            missingEntities
        });

    } catch (error: any) {
        console.error("Validation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
