import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { PurchaseOrder } from '@/modules/core/lib/data';

export function usePurchaseOrders(tenantId: string | null) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "purchaseOrders");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setPurchaseOrders(data);
    }, (error) => {
      console.error(`Error fetching purchaseOrders for tenant ${tenantId}:`, error);
      setPurchaseOrders([]);
    });

    return () => unsub();
  }, [tenantId]);

  return purchaseOrders;
}
