import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { Supplier } from '@/modules/core/lib/data';

export function useSuppliers(tenantId: string | null) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "suppliers");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
      setSuppliers(data);
    }, (error) => {
      console.error(`Error fetching suppliers for tenant ${tenantId}:`, error);
      setSuppliers([]);
    });

    return () => unsub();
  }, [tenantId]);

  return suppliers;
}
