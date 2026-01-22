"use client";

import type { Role } from '@/lib/types';
import { createContext, useContext, useState, type ReactNode, useMemo } from 'react';

interface UserContextType {
  role: Role;
  setRole: (role: Role) => void;
  permissions: {
    canViewAll: boolean;
    canValidate: boolean;
    canSupervise: boolean;
    canLoadExpenses: boolean;
  }
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const getPermissions = (role: Role) => {
    const basePermissions = {
        canViewAll: false,
        canValidate: false,
        canSupervise: false,
        canLoadExpenses: false,
    };

    switch (role) {
        case 'Dirección':
            return { canViewAll: true, canValidate: true, canSupervise: true, canLoadExpenses: true };
        case 'Supervisor':
            return { ...basePermissions, canSupervise: true, canLoadExpenses: true };
        case 'Administración':
            return { ...basePermissions, canValidate: true, canLoadExpenses: true };
        case 'Operador':
            return { ...basePermissions, canLoadExpenses: true };
        default:
            return basePermissions;
    }
}


export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Dirección');
  
  const permissions = useMemo(() => getPermissions(role), [role]);

  return <UserContext.Provider value={{ role, setRole, permissions }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
