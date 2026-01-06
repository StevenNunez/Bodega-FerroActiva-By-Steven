import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { PaymentState } from "@/modules/core/lib/data";

export function usePaymentStates(tenantId: string | null) {
  const [paymentStates, setPaymentStates] = useState<PaymentState[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, `paymentStates`);
    
    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PaymentState));
      setPaymentStates(data);
    }, (error) => {
      console.error(`Error fetching payment states for tenant ${tenantId}:`, error);
      setPaymentStates([]);
    });

    return () => unsub();
  }, [tenantId]);

  return paymentStates;
}
