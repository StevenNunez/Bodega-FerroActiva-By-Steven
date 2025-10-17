
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
    () => purchaseRequests.filter((pr) => pr.status === "approved" && !pr.lotId),
    [purchaseRequests]
  );

  const batchedLots: IntelligentLot[] = useMemo(() => {
    const lotsMap = new Map<string, {
        lotId: string;
        category: string;
        requests: PurchaseRequest[];
        type: LotType;
    }>();

    // 1. Group ALL purchase requests that have a lotId.
    const allRequestsWithLot = purchaseRequests.filter(pr => pr.lotId);

    allRequestsWithLot.forEach((req) => {
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
          const nameMatch = req.lotId.match(/^manual-(.*)-[a-zA-Z0-9]{4}$/);
          categoryName = nameMatch ? nameMatch[1].replace(/-/g, " ") : "Lote Manual";
        }
        
        lotsMap.set(req.lotId, {
          lotId: req.lotId,
          category: categoryName,
          requests: [],
          type,
        });
      }
      lotsMap.get(req.lotId)!.requests.push(req);
    });

    // Add empty manual lots for assignment
    manualLots.forEach(lotId => {
      if (!lotsMap.has(lotId)) {
        const nameMatch = lotId.match(/^manual-(.*)-[a-zA-Z0-9]{4}$/);
        const categoryName = nameMatch ? nameMatch[1].replace(/-/g, " ") : "Lote Manual";
        lotsMap.set(lotId, {
          lotId: lotId,
          category: categoryName,
          requests: [],
          type: 'manual',
        });
      }
    });

    // 2. Filter the map to keep only "active" lots.
    const activeLots: IntelligentLot[] = [];
    lotsMap.forEach((lotData) => {
      // An active lot must have at least one request still in 'batched' state.
      const hasActiveItems = lotData.requests.some(req => req.status === 'batched');
      const isEmptyManualLot = lotData.type === 'manual' && lotData.requests.length === 0;

      if (hasActiveItems || isEmptyManualLot) {
        // Only show requests that are actually in the 'batched' state inside the lot view.
        const activeRequestsInLot = lotData.requests.filter(req => req.status === 'batched');
        const totalQuantity = activeRequestsInLot.reduce((sum, req) => sum + req.quantity, 0);

        activeLots.push({
            ...lotData,
            requests: activeRequestsInLot,
            totalQuantity,
        });
      }
    });

    return activeLots.sort((a, b) => a.category.localeCompare(b.category));
      
  }, [purchaseRequests, suppliers, manualLots]);

  return { approvedRequests, batchedLots };
}
