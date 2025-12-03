import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { AssignedSafetyTask } from '@/modules/core/lib/data';

export function useAssignedChecklists(tenantId: string | null) {
  const [assignedChecklists, setAssignedChecklists] = useState<AssignedSafetyTask[]>([]);
  
  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "assignedChecklists");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignedSafetyTask));
      setAssignedChecklists(data);
    }, (error) => {
      console.error(`Error fetching assignedChecklists for tenant ${tenantId}:`, error);
      setAssignedChecklists([]);
    });

    return () => unsub();
  }, [tenantId]);

  return assignedChecklists;
}
