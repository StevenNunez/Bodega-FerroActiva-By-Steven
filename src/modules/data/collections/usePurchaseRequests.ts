
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { PurchaseRequest } from "@/modules/core/lib/data";

export function usePurchaseRequests(tenantId: string | null) {
  const [data, setData] = useState<PurchaseRequest[] | undefined>(undefined);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "purchaseRequests");

    if (tenantId === null) {
      // Super admin without a tenant selected, query the root collection
      q = query(collRef);
    } else {
      q = query(collRef, where("tenantId", "==", tenantId));
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const fetchedData = snap.docs.map(doc => {
          const docData = doc.data();
          // Ensure createdAt is a Date object for client-side processing
          if (docData.createdAt && docData.createdAt.toDate) {
            docData.createdAt = docData.createdAt.toDate();
          }
           if (docData.receivedAt && docData.receivedAt.toDate) {
            docData.receivedAt = docData.receivedAt.toDate();
          }
           if (docData.approvalDate && docData.approvalDate.toDate) {
            docData.approvalDate = docData.approvalDate.toDate();
          }
          return {
            id: doc.id,
            ...docData
          } as PurchaseRequest
      });
      setData(fetchedData);
    }, (error) => {
      console.error(`Error fetching purchaseRequests for tenant ${tenantId}:`, error);
      setData([]);
    });

    return () => unsub();
  }, [tenantId]);

  return data;
}
