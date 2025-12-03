import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { Tool } from "@/modules/core/lib/data";

export function useTools(tenantId: string | null) {
  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;
    
    let q: Query;
    const collRef = collection(db, "tools");

    if (tenantId === null) {
      q = query(collRef);
    } else {
      q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tool));
      setTools(data);
    }, (error) => {
      console.error(`Error fetching tools for tenant ${tenantId}:`, error);
      setTools([]);
    });

    return () => unsub();
  }, [tenantId]);

  return tools;
}
