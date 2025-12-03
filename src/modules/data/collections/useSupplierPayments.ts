import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { SupplierPayment } from '@/modules/core/lib/data';

export function useSupplierPayments(tenantId: string | null) {
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "supplierPayments");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierPayment));
      setSupplierPayments(data);
    }, (error) => {
      console.error(`Error fetching supplierPayments for tenant ${tenantId}:`, error);
      setSupplierPayments([]);
    });

    return () => unsub();
  }, [tenantId]);

  return supplierPayments;
}
