'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { Role, UserProfile } from '@/lib/types';
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
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const [role, setRole] = useState<Role>('Operador');

  useEffect(() => {
    if (!auth || !firestore) {
      setIsUserLoading(false); // If no auth, not loading
      return;
    };
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Fetch user role from Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userProfile = userDoc.data() as UserProfile;
            setRole(userProfile.role);
          } else {
             // Handle case where user is authenticated but has no profile document
             // For now, we'll create a default one.
            const newUserProfile: UserProfile = {
                id: user.uid,
                email: user.email || 'no-email@example.com',
                fullName: user.displayName || 'Nuevo Usuario',
                role: 'Operador',
                photoURL: user.photoURL || undefined,
            };
            await setDoc(userDocRef, newUserProfile);
            setRole('Operador');
          }
        } catch (e: any) {
          setUserError(e);
          setRole('Operador'); // Default role on error
        }
      } else {
        setUser(null);
        setRole('Operador'); // Reset role on logout
      }
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);
  
  // Use a separate state for role simulation to avoid conflicts with the real role
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);
  const displayRole = simulatedRole || role;
  
  const handleSetRole = (newRole: Role) => {
    setSimulatedRole(newRole);
  }

  const permissions = useMemo(() => getPermissions(displayRole), [displayRole]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
    role: displayRole,
    setRole: handleSetRole,
    permissions,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError, displayRole, permissions]);

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
