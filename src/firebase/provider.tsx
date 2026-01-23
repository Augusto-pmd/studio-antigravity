'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { Role } from '@/lib/types';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Define a mock user shape
const mockUser = {
  uid: 'mock-user-id',
  email: 'operador@pmdarquitectura.com',
  displayName: 'Usuario de Muestra',
  photoURL: 'https://i.pravatar.cc/150?u=mock-user',
  // Add any other user properties your components might need
};

// The shape of the context that will be provided.
export interface FirebaseContextState {
  firebaseApp: any | null;
  firestore: any | null;
  auth: any | null;
  user: any | null;
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

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: any;
  firestore: any;
  auth: any;
}

// This is now a MOCK Firebase Provider
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(mockUser);
  const [isUserLoading, setIsUserLoading] = useState(false); // Set to false, as we are not loading a real user
  const [userError, setUserError] = useState<Error | null>(null);
  const [role, setRole] = useState<Role>('Operador');

  const permissions = useMemo(() => getPermissions(role), [role]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp: null,
    firestore: null,
    auth: null,
    user,
    isUserLoading,
    userError,
    role,
    setRole,
    permissions,
  }), [user, isUserLoading, userError, role, permissions]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {/* The listener can stay as it does nothing if no errors are emitted */}
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

export const useAuth = (): any | null => useFirebase().auth;
export const useFirestore = (): any | null => useFirebase().firestore;
export const useFirebaseApp = (): any | null => useFirebase().firebaseApp;

export const useUser = () => {
  return useFirebase();
};
