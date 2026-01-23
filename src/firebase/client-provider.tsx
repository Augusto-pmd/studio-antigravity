'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseInstances, setFirebaseInstances] = useState<{
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null,
  });

  useEffect(() => {
    // Initialize Firebase only on the client side
    const instances = initializeFirebase();
    setFirebaseInstances(instances);
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseInstances.firebaseApp}
      auth={firebaseInstances.auth}
      firestore={firebaseInstances.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
