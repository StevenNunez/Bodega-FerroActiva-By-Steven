import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { ProgressLog } from "@/modules/core/lib/data";

export function useProgressLogs(tenantId: string | null) {
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, `progressLogs`);
    
    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProgressLog));
      setProgressLogs(data);
    }, (error) => {
      console.error(`Error fetching progress logs for tenant ${tenantId}:`, error);
      setProgressLogs([]);
    });

    return () => unsub();
  }, [tenantId]);

  return progressLogs;
}
