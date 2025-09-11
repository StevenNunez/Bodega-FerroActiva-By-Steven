
// hooks/use-lots.ts
"use client";

import { useMemo } from "react";
import { useAppState } from "@/contexts/app-provider";
import type { PurchaseRequest } from "@/lib/data";

export type LotType = "category" | "supplier" | "manual";

export type IntelligentLot = {
  lotId: string;
  category: string;
  requests: PurchaseRequest[];
  totalQuantity: number;
  type: LotType;
};

export function useLots() {
  const { purchaseRequests, suppliers, manualLots } = useAppState();

  const approvedRequests = useMemo(
    () => purchaseRequests.filter((pr) => pr.status === "approved"),
    [purchaseRequests]
  );

  const batchedLots: IntelligentLot[] = useMemo(() => {
    const lotsMap = new Map<string, IntelligentLot>();

    // First, process all requests that are already in a lot
    const batchedRequests = purchaseRequests.filter(pr => pr.lotId && pr.status === 'batched');

    batchedRequests.forEach((req) => {
      if (!req.lotId) return;

      if (!lotsMap.has(req.lotId)) {
        let categoryName = req.lotId;
        let type: LotType = "manual";

        const isSupplier = suppliers.some((s) => s.id === req.lotId);
        if (isSupplier) {
             type = "supplier";
             categoryName = `Proveedor: ${suppliers.find((s) => s.id === req.lotId)?.name || "Desconocido"}`;
        } else if (req.lotId.startsWith("lot-")) {
          type = "category";
          categoryName = req.category;
        } else if (req.lotId.startsWith("manual-")) {
          type = "manual";
          categoryName = req.lotId.substring(7, req.lotId.lastIndexOf('-')).replace(/-/g, " ");
        }

        lotsMap.set(req.lotId, {
          lotId: req.lotId,
          category: categoryName,
          requests: [],
          totalQuantity: 0,
          type,
        });
      }

      const lot = lotsMap.get(req.lotId)!;
      lot.requests.push(req);
      lot.totalQuantity += req.quantity;
    });
    
    // Now, ensure all manually created lots exist, even if empty
    manualLots.forEach(lotId => {
        if (!lotsMap.has(lotId)) {
            const categoryName = lotId.substring(7, lotId.lastIndexOf('-')).replace(/-/g, " ");
            lotsMap.set(lotId, {
                lotId: lotId,
                category: categoryName,
                requests: [],
                totalQuantity: 0,
                type: 'manual',
            });
        }
    });

    return Array.from(lotsMap.values()).sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  }, [purchaseRequests, suppliers, manualLots]);

  return { approvedRequests, batchedLots };
}
