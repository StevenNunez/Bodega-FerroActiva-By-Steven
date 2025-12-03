
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { MaterialRequest } from '@/modules/core/lib/data';

export function useMaterialRequests(tenantId: string | null) {
  const [data, setData] = useState<MaterialRequest[] | undefined>(undefined);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "requests");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const fetchedData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest));
      setData(fetchedData);
    }, (error) => {
      console.error(`Error fetching requests for tenant ${tenantId}:`, error);
      setData([]);
    });

    return () => unsub();
  }, [tenantId]);

  return data;
}
