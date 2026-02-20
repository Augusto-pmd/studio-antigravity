import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need the admin SDK or a browser-like config if we have it in .env
console.log("Checking project environment variables...");
console.log("PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkProjects() {
    try {
        const snap = await getDocs(collection(db, 'projects'));
        console.log('Total projects:', snap.size);
        snap.forEach(d => console.log(d.id, '=>', d.data().name, '| status:', d.data().status));
    } catch (e) {
        console.error("Error fetching", e);
    }
}

checkProjects();
