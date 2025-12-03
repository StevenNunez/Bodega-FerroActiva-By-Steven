import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { Unit } from '@/modules/core/lib/data';

export function useUnits(tenantId: string | null) {
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "units");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
      setUnits(data);
    }, (error) => {
      console.error(`Error fetching units for tenant ${tenantId}:`, error);
      setUnits([]);
    });

    return () => unsub();
  }, [tenantId]);

  return units;
}
