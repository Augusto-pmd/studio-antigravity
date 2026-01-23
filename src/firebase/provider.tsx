'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { Role } from '@/lib/types';

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
// It no longer depends on Firestore for the initial role check.
const getPermissions = (role: Role, user: User | null) => {
  const isSuperAdmin = user?.email === 'info@pmdarquitectura.com' || role === 'Dirección';
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
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [role, setRole] = useState<Role>('Operador');

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      setUserError(new Error("Auth service not provided."));
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        // We revert to only using the simulated role.
        // This removes the dependency on a Firestore read during the critical auth path, increasing stability for the build process.
        // The role can be changed via the simulation dropdown.
        if (!firebaseUser) {
           setRole('Operador');
        }
        setIsUserLoading(false);
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserError(error);
        setIsUserLoading(false);
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const permissions = useMemo(() => getPermissions(role, user), [role, user]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
    role,
    setRole,
    permissions,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError, role, permissions]);

  return (
    <FirebaseContext.Provider value={contextValue}>
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
