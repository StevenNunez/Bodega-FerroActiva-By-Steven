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
      (req: PurchaseRequest) => !req.lotId && (req.status === 'approved')
    );
  }, [purchaseRequests]);

  const batchedLots = useMemo(() => {
    const safePurchaseRequests = purchaseRequests || [];
    const safePurchaseLots = (purchaseLots || []) as PurchaseLot[];
    // 1. Inicia con los lotes creados manualmente
    const lotsMap = new Map<string, Lot>();
    safePurchaseLots
        .filter((lot: PurchaseLot) => lot.status === 'open')
        .forEach((lot: PurchaseLot) => {
            lotsMap.set(lot.id, {
                lotId: lot.id,
                category: lot.name,
                requests: [],
                totalQuantity: 0,
            });
        });

    // 2. Agrupa las solicitudes que ya tienen un lotId asignado
    const requestsInLots = safePurchaseRequests.filter((req: PurchaseRequest) => req.lotId && req.status === 'batched');
    for (const req of requestsInLots) {
        if (req.lotId && lotsMap.has(req.lotId)) {
            const lot = lotsMap.get(req.lotId)!;
            lot.requests.push(req);
            lot.totalQuantity += req.quantity;
        }
    }
    
    // 3. Agrupa las solicitudes aprobadas por categoría para crear lotes dinámicos
    const approvedAndUnbatched = safePurchaseRequests.filter((req: PurchaseRequest) => req.status === 'approved' && !req.lotId);
    for (const req of approvedAndUnbatched) {
        const category = req.category || 'Sin Categoría';
        if (!lotsMap.has(category)) {
            lotsMap.set(category, {
                lotId: category, // Usamos la categoría como ID temporal para lotes no guardados
                category: category,
                requests: [],
                totalQuantity: 0,
            });
        }
        const lot = lotsMap.get(category)!;
        lot.requests.push(req);
        lot.totalQuantity += req.quantity;
    }


    // 4. Devuelve los lotes como un array, ordenados
    return Array.from(lotsMap.values())
      .filter(lot => lot.requests.length > 0) // Solo mostrar lotes con solicitudes
      .sort((a, b) => a.category.localeCompare(b.category));

  }, [purchaseRequests, purchaseLots]);

  return {
    approvedRequests,
    batchedLots,
  };
}
