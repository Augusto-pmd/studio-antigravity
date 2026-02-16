import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, data } = body;

        // type: 'project' | 'supplier' | 'employee' | 'contractor'

        if (!name || !type) {
            return NextResponse.json({ error: 'Missing name or type' }, { status: 400 });
        }

        let collectionName = '';
        let docData: any = {
            name,
            createdAt: new Date().toISOString(),
            status: 'Active', // Default
            ...data
        };

        switch (type) {
            case 'project':
                collectionName = 'projects';
                docData.status = 'En Ejecución';
                break;
            case 'employee':
                collectionName = 'employees';
                break;
            case 'contractor':
                collectionName = 'contractors';
                break;
            case 'supplier':
                collectionName = 'suppliers'; // Assuming we have this, or use generic
                break;
            default:
                return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
        }

        const ref = await addDoc(collection(db, collectionName), docData);
        // Also update the ID in the doc if we follow that pattern
        await setDoc(ref, { id: ref.id }, { merge: true });

        return NextResponse.json({ success: true, id: ref.id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
