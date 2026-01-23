// This file is the single entrypoint for all Firebase-related functionality.
// It re-exports hooks and providers from other files for easy access.
// IMPORTANT: This file should NOT contain any Firebase initialization logic
// to ensure it can be safely imported in both client and server environments.

export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, useUser } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
