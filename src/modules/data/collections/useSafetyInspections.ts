
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { SafetyInspection } from '@/modules/core/lib/data';

export function useSafetyInspections(tenantId: string | null) {
  const [safetyInspections, setSafetyInspections] = useState<SafetyInspection[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "safetyInspections");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }
    

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyInspection));
      setSafetyInspections(data);
    }, (error) => {
      console.error(`Error fetching safetyInspections for tenant ${tenantId}:`, error);
      setSafetyInspections([]);
    });

    return () => unsub();
  }, [tenantId]);
  
  return safetyInspections;
}
