'use client';

import { type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { firebaseApp, auth, firestore } from './index';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
