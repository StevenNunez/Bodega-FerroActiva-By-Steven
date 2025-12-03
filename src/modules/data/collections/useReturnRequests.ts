import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { ReturnRequest } from '@/modules/core/lib/data';

export function useReturnRequests(tenantId: string | null) {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "returnRequests");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReturnRequest));
      setReturnRequests(data);
    }, (error) => {
      console.error(`Error fetching returnRequests for tenant ${tenantId}:`, error);
      setReturnRequests([]);
    });

    return () => unsub();
  }, [tenantId]);

  return returnRequests;
}
