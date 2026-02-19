
import { NextRequest, NextResponse } from 'next/server';
import { ImportLegacyService } from '@/lib/services/import-legacy';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { parseISO, isValid } from 'date-fns';

export async function POST(req: NextRequest) {
    console.log('[API] Import Legacy POST received');
    try {
        const formData = await req.formData();
        const file = formData.get('file'); // Don't cast yet, check type
        const weekStartStr = formData.get('weekStart') as string;
        const weekEndStr = formData.get('weekEnd') as string;

        console.log('[API] Params:', {
            hasFile: !!file,
            fileType: file instanceof File ? 'File' : typeof file,
            weekStartStr,
            weekEndStr
        });

        if (!file || !(file instanceof File) || !weekStartStr || !weekEndStr) {
            console.error('[API] Missing or invalid parameters');
            return NextResponse.json({ error: 'Missing file, weekStart, or weekEnd' }, { status: 400 });
        }

        const weekStart = parseISO(weekStartStr);
        const weekEnd = parseISO(weekEndStr);

        if (!isValid(weekStart) || !isValid(weekEnd)) {
            console.error('[API] Invalid dates');
            return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
        }

        console.log('[API] Reading buffer...');
        const buffer = await file.arrayBuffer();
        console.log('[API] Buffer size:', buffer.byteLength);

        // Ensure PayrollWeek exists
        let weekId = '';
        const weeksRef = collection(db, 'payrollWeeks');
        const q = query(weeksRef, where('startDate', '==', weekStartStr));
        const snap = await getDocs(q);

        if (!snap.empty) {
            weekId = snap.docs[0].id;
            console.log('[API] Found existing week:', weekId);
        } else {
            console.log('[API] Creating new week...');
            const newWeek = await addDoc(weeksRef, {
                startDate: weekStartStr,
                endDate: weekEndStr,
                status: 'OPEN'
            });
            weekId = newWeek.id;
            console.log('[API] New week created:', weekId);
        }

        console.log('[API] Processing Excel...');
        const result = await ImportLegacyService.processLegacyExcel(
            buffer,
            weekStart,
            weekEnd,
            weekId
        );
        console.log('[API] Process result:', result.success);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[API] Critical Error in Import Route:', error);
        // Explicitly return a JSON object to prevent default HTML 500
        return NextResponse.json({
            success: false,
            summary: {
                errors: [error.message || 'Unknown Server Error'],
                warnings: [],
                attendanceCreated: 0,
                certificationsCreated: 0,
                fundRequestsCreated: 0
            }
        }, { status: 500 });
    }
}
