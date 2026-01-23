'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [realRole, setRealRole] = useState<Role>('Operador');
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!auth || !firestore) {
      // If Firebase services aren't available, we're not loading a user.
      setIsUserLoading(false);
      return;
    };
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDocRef = doc(firestore, 'users', authUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userProfile = userDoc.data() as UserProfile;
            setRealRole(userProfile.role);
          } else {
             // Handle case where user is authenticated but has no profile document (first login)
            const newUserProfile: UserProfile = {
                id: authUser.uid,
                email: authUser.email || 'no-email@example.com',
                fullName: authUser.displayName || 'Nuevo Usuario',
                role: 'Operador',
                photoURL: authUser.photoURL || undefined,
            };
            await setDoc(userDocRef, newUserProfile);
            setRealRole('Operador');
          }
        } catch (e: any) {
          console.error("Error fetching user profile:", e);
          setUserError(e);
          setRealRole('Operador'); // Default role on error
        }
      } else {
        setUser(null);
        setRealRole('Operador'); // Reset role on logout
        setSimulatedRole(null);
      }
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);
  
  const displayRole = simulatedRole || realRole;
  
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
