
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { SalaryAdvance } from '@/modules/core/lib/data';

export function useSalaryAdvances(tenantId: string | null) {
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "salaryAdvances");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance));
      setSalaryAdvances(data);
    }, (error) => {
      console.error(`Error fetching salaryAdvances for tenant ${tenantId}:`, error);
      setSalaryAdvances([]);
    });

    return () => unsub();
  }, [tenantId]);

  return salaryAdvances;
}
