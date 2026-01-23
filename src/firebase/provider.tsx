'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { Role, UserProfile, Permissions } from '@/lib/types';

// This is a simplified User type for the mock.
// It doesn't import from 'firebase/auth' to avoid dependency issues.
type MockUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

interface FirebaseContextValue {
  user: MockUser | null;
  userProfile: UserProfile | null;
  role: Role;
  setRole: (role: Role) => void;
  permissions: Permissions;
  isUserLoading: boolean;
  // Keep these for type compatibility with other components
  auth: any | null;
  firestore: any | null;
  firebaseApp: any | null;
}

// Create a default user for the simulation
const MOCK_USER: MockUser = {
  uid: 'dev-user-uid',
  email: 'usuario@pmdarquitectura.com',
  displayName: 'Usuario de Prueba',
  photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjkwNzc4MDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
};

const MOCK_USER_PROFILE: UserProfile = {
    id: 'dev-user-uid',
    fullName: 'Usuario de Prueba',
    email: 'usuario@pmdarquitectura.com',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjkwNzc4MDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    role: 'Dirección',
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [simulatedRole, setSimulatedRole] = useState<Role>('Dirección');
  const role = simulatedRole;

  const permissions = useMemo<Permissions>(() => {
    const isSuperAdmin = role === 'Dirección';
    const canValidate = role === 'Dirección' || role === 'Administración';
    return { isSuperAdmin, canValidate, canLoadExpenses: true };
  }, [role]);

  const value: FirebaseContextValue = {
    user: MOCK_USER,
    userProfile: MOCK_USER_PROFILE,
    role,
    setRole: setSimulatedRole,
    permissions,
    isUserLoading: false,
    auth: null,
    firestore: null,
    firebaseApp: null,
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
export const useUser = useFirebase;
export const useFirebaseApp = () => null;
export const useAuth = () => null;
export const useFirestore = () => null;
export const useCollection = (query: any) => ({ data: [], isLoading: false });
export const useDoc = (ref: any) => ({ data: null, isLoading: false });
