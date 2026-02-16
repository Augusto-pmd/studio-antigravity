
import { NextRequest, NextResponse } from 'next/server';
import { ImportLegacyService } from '@/lib/services/import-legacy';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { parseISO, isValid } from 'date-fns';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const weekStartStr = formData.get('weekStart') as string;
        const weekEndStr = formData.get('weekEnd') as string;

        if (!file || !weekStartStr || !weekEndStr) {
            return NextResponse.json({ error: 'Missing file, weekStart, or weekEnd' }, { status: 400 });
        }

        const weekStart = parseISO(weekStartStr);
        const weekEnd = parseISO(weekEndStr);

        if (!isValid(weekStart) || !isValid(weekEnd)) {
            return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        // Ensure PayrollWeek exists
        let weekId = '';
        const weeksRef = collection(db, 'payrollWeeks');
        const q = query(weeksRef, where('startDate', '==', weekStartStr));
        const snap = await getDocs(q);

        if (!snap.empty) {
            weekId = snap.docs[0].id;
        } else {
            const newWeek = await addDoc(weeksRef, {
                startDate: weekStartStr,
                endDate: weekEndStr,
                status: 'OPEN'
            });
            weekId = newWeek.id;
        }

        const result = await ImportLegacyService.processLegacyExcel(
            buffer,
            weekStart,
            weekEnd,
            weekId
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
