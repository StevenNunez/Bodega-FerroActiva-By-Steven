import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { ChecklistTemplate } from '@/modules/core/lib/data';

export function useChecklistTemplates(tenantId: string | null) {
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "checklistTemplates");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistTemplate));
      setChecklistTemplates(data);
    }, (error) => {
      console.error(`Error fetching checklistTemplates for tenant ${tenantId}:`, error);
      setChecklistTemplates([]);
    });

    return () => unsub();
  }, [tenantId]);

  return checklistTemplates;
}
