
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { Tenant } from '@/modules/core/lib/data';

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'tenants'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
      setTenants(data);
    }, (error) => {
      console.error("Error fetching tenants:", error);
      setTenants([]);
    });

    return () => unsub();
  }, []);

  return tenants;
}
