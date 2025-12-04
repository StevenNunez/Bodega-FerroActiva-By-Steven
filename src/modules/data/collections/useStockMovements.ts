import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where, Query } from "firebase/firestore";
import { db } from "@/modules/core/lib/firebase";
import { StockMovement } from "@/modules/core/lib/data";

export function useStockMovements(tenantId: string | null) {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "stockMovements");

    if (tenantId === null) {
      q = query(collRef);
    } else {
      q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as StockMovement)
        );
        setStockMovements(data);
      },
      (error) => {
        console.error(
          `Error fetching stockMovements for tenant ${tenantId}:`,
          error
        );
        setStockMovements([]);
      }
    );

    return () => unsub();
  }, [tenantId]);

  return stockMovements;
}
