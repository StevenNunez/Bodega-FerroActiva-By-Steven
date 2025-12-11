import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { WorkItem } from "@/modules/core/lib/data";

export function useWorkItems(tenantId: string | null) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, `workItems`);
    
    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkItem));
      setWorkItems(data);
    }, (error) => {
      console.error(`Error fetching work items for tenant ${tenantId}:`, error);
      setWorkItems([]);
    });

    return () => unsub();
  }, [tenantId]);

  return workItems;
}
