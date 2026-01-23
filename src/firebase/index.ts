'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Initializes Firebase services, ensuring it's done only once.
 * This simplified version is more robust for different development environments.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  if (getApps().length === 0) {
    // If no Firebase app has been initialized, initialize one.
    app = initializeApp(firebaseConfig);
  } else {
    // Otherwise, get the already initialized app.
    app = getApp();
  }

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

// Re-export everything else from the firebase directory
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
