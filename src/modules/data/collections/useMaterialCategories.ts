import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { MaterialCategory } from '@/modules/core/lib/data';

export function useMaterialCategories(tenantId: string | null) {
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "materialCategories");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialCategory));
      setMaterialCategories(data);
    }, (error) => {
      console.error(`Error fetching materialCategories for tenant ${tenantId}:`, error);
      setMaterialCategories([]);
    });

    return () => unsub();
  }, [tenantId]);

  return materialCategories;
}
