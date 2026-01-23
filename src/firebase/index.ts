'use client';

// This file is simplified to only export the mocked providers and hooks.
// Real Firebase initialization is removed.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';

// Mock initializeFirebase function
export function initializeFirebase() {
  console.log("Firebase initialization is mocked and disabled.");
  return {
    firebaseApp: null,
    auth: null,
    firestore: null,
  };
}
