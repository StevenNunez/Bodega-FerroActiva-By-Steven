import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { BehaviorObservation } from '@/modules/core/lib/data';

export function useBehaviorObservations(tenantId: string | null) {
  const [behaviorObservations, setBehaviorObservations] = useState<BehaviorObservation[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "behaviorObservations");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BehaviorObservation));
      setBehaviorObservations(data);
    }, (error) => {
      console.error(`Error fetching behaviorObservations for tenant ${tenantId}:`, error);
      setBehaviorObservations([]);
    });

    return () => unsub();
  }, [tenantId]);

  return behaviorObservations;
}
