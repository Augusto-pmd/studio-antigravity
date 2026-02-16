import { NextRequest, NextResponse } from 'next/server';
import { listFiles, uploadFile } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get('folderId');

        const files = await listFiles(folderId || undefined);
        return NextResponse.json({ files });
    } catch (error: any) {
        console.error('Drive API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch files' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Explicitly cast to string to avoid type errors if file.type is null/undefined (though File usually has it)
        const mimeType = file.type || 'application/octet-stream';

        const result = await uploadFile(file.name, mimeType, buffer, folderId || undefined);

        return NextResponse.json({ success: true, file: result });
    } catch (error: any) {
        console.error('Drive Upload Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        );
    }
}
