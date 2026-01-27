'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from './provider';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

interface FirebaseInstances {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// The initialization function is now local to the provider
function initializeFirebase(): FirebaseInstances {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { firebaseApp: app, auth, firestore };
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the initial render, ensuring a single initialization.
    setInstances(initializeFirebase());
  }, []);

  // While initializing, pass nulls. The hooks can handle this.
  return (
    <FirebaseProvider
      firebaseApp={instances?.firebaseApp ?? null}
      auth={instances?.auth ?? null}
      firestore={instances?.firestore ?? null}
    >
      {children}
    </FirebaseProvider>
  );
}
