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

    // Super admin gets all permissions, this is the main gate for sensitive modules
    if (isSuperAdmin) {
        return { canViewAll: true, canValidate: true, canSupervise: true, canLoadExpenses: true, isSuperAdmin: true };
    }

    // All other authenticated users get a broad set of permissions by default now
    const allPermissions = {
      canViewAll: true,
      canValidate: true,
      canSupervise: true,
      canLoadExpenses: true,
      isSuperAdmin: false, // isSuperAdmin is the only thing that's truly gated.
    };

    // We can still have role-specific logic if needed, but for now, let's open it up.
    switch (role) {
        case 'Dirección':
        case 'Supervisor':
        case 'Administración':
        case 'Operador':
        default:
            return allPermissions;
    }
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
