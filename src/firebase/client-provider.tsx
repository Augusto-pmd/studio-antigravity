'use client';

import { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebase = useMemo(() => {
    if (!firebaseApp) {
      const initialized = initializeFirebase();
      firebaseApp = initialized.firebaseApp;
      auth = initialized.auth;
      firestore = initialized.firestore;
    }
    return { firebaseApp, auth, firestore };
  }, []);

  return (
    <FirebaseProvider {...firebase}>
      {children}
    </FirebaseProvider>
  );
}
