'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { Role, UserProfile, Permissions } from '@/lib/types';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { useUser as useAuthUserHook } from './auth/use-user';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  role: Role;
  setRole: (role: Role) => void;
  permissions: Permissions;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

export function FirebaseProvider({ children, firebaseApp, auth, firestore }: FirebaseProviderProps) {
  const { user, userProfile, isLoading } = useAuthUserHook(auth, firestore);
  const [simulatedRole, setSimulatedRole] = useState<Role>('Dirección');

  const role = userProfile?.role || simulatedRole;

  const permissions = useMemo<Permissions>(() => {
    const isSuperAdmin = role === 'Dirección';
    const canValidate = role === 'Dirección' || role === 'Administración';
    // Simplified logic, in a real app this might be more complex
    const canLoadExpenses = role === 'Dirección' || role === 'Administración' || role === 'Supervisor';
    return { isSuperAdmin, canValidate, canLoadExpenses };
  }, [role]);

  const value: FirebaseContextValue = {
    firebaseApp,
    auth,
    firestore,
    user,
    userProfile,
    isUserLoading: isLoading,
    role,
    setRole: setSimulatedRole,
    permissions,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

// HOOKS
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
};

export const useUser = () => {
    const context = useFirebase();
    if (context === undefined) throw new Error('useUser must be used within a FirebaseProvider');
    return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
