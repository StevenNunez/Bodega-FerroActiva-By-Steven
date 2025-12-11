
'use client';

import { useMemo } from 'react';
import { useAppState } from '@/modules/core/contexts/app-provider';
import type { PurchaseRequest, PurchaseLot } from '@/modules/core/lib/data';

interface Lot {
  lotId: string;
  category: string;
  requests: PurchaseRequest[];
  totalQuantity: number;
}

export function useLots() {
  const { purchaseRequests, purchaseLots } = useAppState();

  const approvedRequests = useMemo(() => {
    return (purchaseRequests || []).filter(
      // Ahora incluye 'approved' Y 'batched' si no tienen lote, para recapturar solicitudes removidas.
      (req: PurchaseRequest) => !req.lotId && (req.status === 'approved' || req.status === 'batched')
    );
  }, [purchaseRequests]);

  const batchedLots = useMemo(() => {
    const safePurchaseRequests = purchaseRequests || [];
    const safePurchaseLots = (purchaseLots || []) as PurchaseLot[];
    
    const lotsMap = new Map<string, Lot>();
    
    // 1. Inicia con los lotes creados manualmente que están abiertos.
    safePurchaseLots
        .filter((lot: PurchaseLot) => lot.status === 'open')
        .forEach((lot: PurchaseLot) => {
            lotsMap.set(lot.id, {
                lotId: lot.id,
                category: lot.name, // El nombre del lote es la categoría principal
                requests: [],
                totalQuantity: 0,
            });
        });

    // 2. Procesa todas las solicitudes que ya tienen un lotId asignado
    const requestsWithLot = safePurchaseRequests.filter(
        (req: PurchaseRequest) => req.lotId && (req.status === 'batched' || req.status === 'approved')
    );

    for (const req of requestsWithLot) {
        if (req.lotId && lotsMap.has(req.lotId)) {
            const lot = lotsMap.get(req.lotId)!;
            lot.requests.push(req);
            lot.totalQuantity += Number(req.quantity) || 0;
        }
    }
    
    return Array.from(lotsMap.values())
      .sort((a, b) => a.category.localeCompare(b.category));

  }, [purchaseRequests, purchaseLots]);

  return {
    approvedRequests,
    batchedLots,
  };
}
