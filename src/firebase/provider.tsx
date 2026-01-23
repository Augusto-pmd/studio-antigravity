'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { Role, UserProfile } from '@/lib/types';

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

const getPermissions = (role: Role, user: User | null) => {
  const isSuperAdmin = user?.email === 'info@pmdarquitectura.com';
  return {
    canViewAll: true,
    canValidate: true,
    canSupervise: true,
    canLoadExpenses: true,
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
  // Default role is 'Operador', it will be updated upon login from Firestore profile.
  const [role, setRole] = useState<Role>('Operador');

  useEffect(() => {
    if (!auth || !firestore) {
      setIsUserLoading(false);
      setUserError(new Error("Auth or Firestore service not provided."));
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          // Fetch user profile from Firestore to get the real role
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userProfile = userDocSnap.data() as UserProfile;
              setRole(userProfile.role);
            } else {
               // This case happens for a brand new user who just signed up
               // The login page will create the doc, but there's a race condition.
               // Let's keep the simulated role for now. The simulation is part of the app.
            }
          } catch (e) {
            console.error("Failed to fetch user profile:", e);
            // Keep the simulated role, but log the error.
          }
        } else {
          // On logout, reset role to a sensible default.
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
  }, [auth, firestore]);

  const permissions = useMemo(() => getPermissions(role, user), [role, user]);

  // Memoize the entire context value to prevent unnecessary re-renders of consumers.
  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
    role,
    setRole, // This allows the role simulation to continue working
    permissions,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError, role, permissions]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access the full Firebase context.
 * Throws an error if used outside of FirebaseProvider.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

// Hooks for specific parts of the context
export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;

/**
 * The primary hook for components to get user info, auth state, role, and permissions.
 */
export const useUser = () => {
  return useFirebase();
};
