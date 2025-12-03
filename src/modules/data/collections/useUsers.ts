import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { User } from '@/modules/core/lib/data';

export function useUsers(tenantId: string | null) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return; 

    let q: Query<DocumentData>;
    const usersRef = collection(db, 'users');

    if (tenantId === null) { // Super admin viewing all tenants
      q = query(usersRef);
    } else {
      q = query(usersRef, where('tenantId', '==', tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(data);
    }, (error) => {
        console.error("Error fetching users:", error);
        setUsers([]);
    });

    return () => unsub();
  }, [tenantId]);

  return users;
}
