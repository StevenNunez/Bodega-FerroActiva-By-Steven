
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { ROLES as ROLES_DEFAULT } from '@/modules/core/lib/permissions';

export function useRoles() {
    const [roles, setRoles] = useState<any>(undefined); // Start as undefined

    useEffect(() => {
        const rolesRef = query(collection(db, 'roles'));
        const unsub = onSnapshot(rolesRef, (snap) => {
            if (snap.empty) {
                setRoles(ROLES_DEFAULT);
            } else {
                const fetchedRoles = snap.docs.reduce((acc, doc) => {
                    acc[doc.id] = doc.data();
                    return acc;
                }, {} as any);
                setRoles(fetchedRoles);
            }
        }, (error) => {
            console.error("Error fetching roles, falling back to default:", error);
            setRoles(ROLES_DEFAULT);
        });

        return () => unsub();
    }, []);

    return roles;
}
