import { google } from 'googleapis';

// Environment variables for Service Account
// We expect a single JSON string/base64 or individual fields. 
// For simplicity in Vercel/similar envs, individual fields are often safer to manage than a big JSON string.
const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID; // The "PMD Corporativo" folder ID

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export async function getDriveClient() {
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Fix newlines in env vars

    console.log('[Debug] getDriveClient env check:');
    console.log(`- EMAIL present: ${!!GOOGLE_CLIENT_EMAIL} (${GOOGLE_CLIENT_EMAIL?.substring(0, 10)}...)`);
    console.log(`- KEY present: ${!!GOOGLE_PRIVATE_KEY} (Length: ${GOOGLE_PRIVATE_KEY?.length})`);

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing Google Service Account credentials (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY)');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_CLIENT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
}

export async function listFiles(uploadedFolderId?: string) {
    const folderId = uploadedFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
    const drive = await getDriveClient();

    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)',
            orderBy: 'folder,name',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });
        return res.data.files || [];
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
}

export async function uploadFile(
    name: string,
    mimeType: string,
    buffer: Buffer,
    uploadedParentId?: string
) {
    const parentId = uploadedParentId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
    const drive = await getDriveClient();
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    try {
        const res = await drive.files.create({
            requestBody: {
                name,
                parents: [parentId],
            },
            media: {
                mimeType,
                body: bufferStream,
            },
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });
        return res.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

export async function getFileStream(fileId: string) {
    const drive = await getDriveClient();
    try {
        const res = await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'stream' }
        );
        return res.data;
    } catch (error) {
        console.error('Error getting file stream:', error);
        throw error;
    }
}
