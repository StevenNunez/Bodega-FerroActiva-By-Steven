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
                category: lot.name, // Usar el nombre del lote como "categoría" de visualización
                requests: [],
                totalQuantity: 0,
            });
        });

    // 2. Agrupa todas las solicitudes que no han sido ordenadas
    const pendingRequests = safePurchaseRequests.filter(
        (req: PurchaseRequest) => req.status === 'approved' || req.status === 'batched'
    );

    for (const req of pendingRequests) {
        let lotKey: string;
        let lotCategory: string;

        // Si la solicitud ya está en un lote manual, úsalo.
        if (req.lotId && lotsMap.has(req.lotId)) {
            lotKey = req.lotId;
            lotCategory = lotsMap.get(req.lotId)!.category;
        } else {
            // Si no, agrúpala por su categoría de material.
            lotKey = req.category || 'Sin Categoría';
            lotCategory = req.category || 'Sin Categoría';
        }

        if (!lotsMap.has(lotKey)) {
            lotsMap.set(lotKey, {
                lotId: lotKey,
                category: lotCategory,
                requests: [],
                totalQuantity: 0,
            });
        }
        
        const lot = lotsMap.get(lotKey)!;
        lot.requests.push(req);
        lot.totalQuantity += Number(req.quantity) || 0;
    }

    // 3. Devuelve los lotes como un array, ordenados
    return Array.from(lotsMap.values())
      .filter(lot => lot.requests.length > 0) // Solo mostrar lotes con solicitudes
      .sort((a, b) => a.category.localeCompare(b.category));

  }, [purchaseRequests, purchaseLots]);

  return {
    approvedRequests,
    batchedLots,
  };
}
