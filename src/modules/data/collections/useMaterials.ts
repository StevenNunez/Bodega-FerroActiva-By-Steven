import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { Material } from "@/modules/core/lib/data";

export function useMaterials(tenantId: string | null) {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, `materials`);
    
    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      setMaterials(data);
    }, (error) => {
      console.error(`Error fetching materials for tenant ${tenantId}:`, error);
      setMaterials([]);
    });

    return () => unsub();
  }, [tenantId]);

  return materials;
}
