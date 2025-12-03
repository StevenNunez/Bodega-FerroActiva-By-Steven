import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { PurchaseLot } from '@/modules/core/lib/data';

export function usePurchaseLots(tenantId: string | null) {
  const [purchaseLots, setPurchaseLots] = useState<PurchaseLot[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "purchaseLots");
    
    if (tenantId === null) {
      q = query(collRef);
    } else {
      q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseLot));
      setPurchaseLots(data);
    }, (error) => {
      console.error(`Error fetching purchaseLots for tenant ${tenantId}:`, error);
      setPurchaseLots([]);
    });

    return () => unsub();
  }, [tenantId]);

  return purchaseLots;
}
