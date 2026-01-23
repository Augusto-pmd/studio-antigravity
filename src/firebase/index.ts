'use client';

import { FirebaseApp, initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

interface FirebaseInstances {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function initializeFirebase(): FirebaseInstances {
  const apps = getApps();
  const firebaseApp = apps.length ? apps[0] : initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  return { firebaseApp, auth, firestore };
}

export { FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
