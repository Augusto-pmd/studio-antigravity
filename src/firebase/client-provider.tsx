'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// This provider is simplified to pass through children without initializing real Firebase.
// The actual mocking happens in FirebaseProvider.
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider
      firebaseApp={null}
      auth={null}
      firestore={null}
    >
      {children}
    </FirebaseProvider>
  );
}
