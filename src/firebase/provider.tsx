'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// The shape of the context that will be provided.
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  role: Role;
  setRole: (role: Role) => void;
  permissions: {
    canViewAll: boolean;
    canValidate: boolean;
    canSupervise: boolean;
    canLoadExpenses: boolean;
    isSuperAdmin: boolean;
  };
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// This is a simplified permission model based on the simulated role.
const getPermissions = (role: Role) => {
  const isSuperAdmin = role === 'Dirección';
  return {
    canViewAll: isSuperAdmin || role === 'Administración' || role === 'Supervisor',
    canValidate: isSuperAdmin || role === 'Administración',
    canSupervise: isSuperAdmin || role === 'Supervisor',
    canLoadExpenses: true, // All roles can load expenses
    isSuperAdmin: isSuperAdmin,
  };
};

// --- MOCKED USER DATA FOR DIAGNOSTIC BUILD ---
const MOCK_USER: User = {
  uid: 'mock-user-id',
  email: 'director@pmdarquitectura.com',
  displayName: 'Usuario de Prueba',
  photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  providerId: 'google.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, authTime: '', expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
  reload: async () => {},
  toJSON: () => ({}),
};
// --- END MOCKED USER DATA ---


interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  // For this diagnostic build, we are not checking auth state.
  // We simulate a logged-in user to make the app render.
  const user = MOCK_USER;
  const isUserLoading = false; 
  const userError = null;

  const [role, setRole] = useState<Role>('Dirección');
  const permissions = useMemo(() => getPermissions(role), [role]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp: null, // Disconnected for diagnostics
    firestore: null, // Disconnected for diagnostics
    auth: null,      // Disconnected for diagnostics
    user,
    isUserLoading,
    userError,
    role,
    setRole,
    permissions,
  }), [user, isUserLoading, userError, role, permissions]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {/* FirebaseErrorListener can stay as it does nothing if no errors are emitted */}
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;

export const useUser = () => {
  return useFirebase();
};
