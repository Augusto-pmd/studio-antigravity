'use client';

import type { Role } from '@/lib/types';
import { createContext, useContext, useState, type ReactNode, useMemo } from 'react';
import { useUser as useFirebaseUser, useFirestore } from '@/firebase/provider';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  isUserLoading: boolean;
  firestore: Firestore | null;
  role: Role;
  setRole: (role: Role) => void;
  permissions: {
    canViewAll: boolean;
    canValidate: boolean;
    canSupervise: boolean;
    canLoadExpenses: boolean;
    isSuperAdmin: boolean;
  }
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const getPermissions = (role: Role, user: User | null) => {
    const isSuperAdmin = user?.email === 'info@pmdarquitectura.com';

    // Permissions are now open by default for all logged-in users.
    // Only super admin functionality is specifically gated.
    return {
        canViewAll: true,
        canValidate: true,
        canSupervise: true,
        canLoadExpenses: true,
        isSuperAdmin: isSuperAdmin,
    };
}


export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useFirebaseUser();
  const firestore = useFirestore();
  const [role, setRole] = useState<Role>('Dirección');
  
  const permissions = useMemo(() => getPermissions(role, user), [role, user]);

  const value = {
    user,
    isUserLoading,
    firestore,
    role,
    setRole,
    permissions
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
