'use client';
import { useMemo } from 'react';
import { UserRole } from '@/lib/data';
import { ROLES, Permission, getPermissionsForRole } from '@/lib/permissions';

export function usePermissions(role: UserRole | null) {
    const permissions = useMemo(() => {
        if (!role) return [];
        return getPermissionsForRole(role);
    }, [role]);

    const can = (permission: Permission): boolean => {
        if (role === 'super-admin') return true;
        return permissions.includes(permission);
    };

    return { can, permissions };
}
