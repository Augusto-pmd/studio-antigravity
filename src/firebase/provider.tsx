'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
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
  role: Role | null;
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

  const role = userProfile?.role || null;

  const permissions = useMemo<Permissions>(() => {
    if (!role) {
      return { isSuperAdmin: false, canValidate: false, canLoadExpenses: false, canManageProjects: false, canSupervise: false, canManageStock: false, canManageSales: false };
    }
    const isSuperAdmin = role === 'Dirección';
    const canValidate = role === 'Dirección' || role === 'Administración';
    const canSupervise = role === 'Dirección' || role === 'Supervisor' || role === 'Administración';
    const canLoadExpenses = !!role;
    const canManageProjects = !!role;
    const canManageStock = !!role;
    const canManageSales = !!role;
    return { isSuperAdmin, canValidate, canLoadExpenses, canManageProjects, canSupervise, canManageStock, canManageSales };
  }, [role]);

  const value: FirebaseContextValue = useMemo(() => ({
    firebaseApp,
    auth,
    firestore,
    user,
    userProfile,
    isUserLoading: isLoading,
    role,
    permissions,
  }), [firebaseApp, auth, firestore, user, userProfile, isLoading, role, permissions]);

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
