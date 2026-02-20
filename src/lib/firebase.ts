import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;

if (typeof window !== "undefined") {
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (error) {
        db = getFirestore(app);
    }
} else {
    db = getFirestore(app);
}

export { db };
