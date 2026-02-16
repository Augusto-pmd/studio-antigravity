import { listFiles } from '../src/lib/google-drive';
import path from 'path';

// Load env vars using require to bypass TS issues with missing types
const dotenv = require('dotenv');
const envConfig = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }).parsed || {};

// Manual override
if (envConfig.GOOGLE_CLIENT_EMAIL) process.env.GOOGLE_CLIENT_EMAIL = envConfig.GOOGLE_CLIENT_EMAIL;
if (envConfig.GOOGLE_PRIVATE_KEY) process.env.GOOGLE_PRIVATE_KEY = envConfig.GOOGLE_PRIVATE_KEY;
if (envConfig.GOOGLE_DRIVE_ROOT_FOLDER_ID) process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = envConfig.GOOGLE_DRIVE_ROOT_FOLDER_ID;

async function verify() {
    console.log('Verifying Google Drive Connection...');
    console.log('Client Email:', process.env.GOOGLE_CLIENT_EMAIL?.substring(0, 15) + '...');

    // Ensure newlines
    if (process.env.GOOGLE_PRIVATE_KEY) {
        process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    }

    console.log('Root Folder ID:', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);

    try {
        const files = await listFiles();
        console.log('✅ Connection Successful!');
        console.log(`Found ${files.length} files/folders.`);
        files.forEach(f => console.log(`- ${f.name} (${f.id})`));
    } catch (error: any) {
        console.error('❌ Connection Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

verify();
