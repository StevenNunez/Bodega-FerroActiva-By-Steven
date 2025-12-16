

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  query,
  where,
  getDoc,
  getDocs,
  FieldValue,
  setDoc
} from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { PurchaseRequest, Material, FirestoreWriteableDate, PurchaseLot, PurchaseOrder } from '@/modules/core/lib/data';
import { nanoid } from 'nanoid';


type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

type CreatablePurchaseRequest = Omit<PurchaseRequest, 'id' | 'createdAt' | 'approvalDate' | 'receivedAt'> & {
  createdAt: FieldValue;
  approvalDate?: FieldValue;
  receivedAt?: FieldValue;
}

export async function addPurchaseRequest(
  data: Partial<Omit<PurchaseRequest, 'id' | 'status' | 'createdAt' | 'tenantId'>>,
  context: Context
) {
  const { user, tenantId } = context;
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');

  const requestData = {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    tenantId: tenantId,
    requesterName: user.name,
  };

  const collectionRef = collection(db, `purchaseRequests`);
  await addDoc(collectionRef, requestData);
}

export async function updatePurchaseRequestStatus(
  requestId: string,
  status: PurchaseRequest['status'],
  data: Partial<PurchaseRequest>,
  context: Context
) {
  const { user, tenantId } = context;
  if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

  const requestRef = doc(db, `purchaseRequests`, requestId);

  await runTransaction(db, async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) {
      throw new Error("Solicitud no encontrada.");
    }
    
    if (requestDoc.data().tenantId !== tenantId) {
        throw new Error("No tienes permiso para modificar esta solicitud.");
    }

    const currentData = requestDoc.data();
    
    const updateData: Partial<PurchaseRequest> = {
      ...data,
      status: status,
    };

    if (data.quantity !== undefined && data.quantity !== currentData.quantity && (currentData.originalQuantity === undefined || currentData.originalQuantity === null)) {
      updateData.originalQuantity = currentData.quantity;
    }

    if (status === 'approved' && currentData.status !== 'approved') {
      updateData.approverId = user.id;
      updateData.approverName = user.name;
      (updateData as any).approvalDate = serverTimestamp();
    }
    
    if (status === 'ordered') {
        (updateData as any).orderedAt = serverTimestamp();
    }
    
    if (status === 'rejected') {
        (updateData as any).rejectionDate = serverTimestamp();
        updateData.rejectionReason = data.notes || "Rechazado en gestión de OC";
    }

    transaction.update(requestRef, updateData as any);
  });
}

export async function receivePurchaseRequest(
    requestId: string,
    receivedQuantity: number,
    existingMaterialId: string | undefined,
    context: Context
) {
    const { user, tenantId, db: database } = context;
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

    const requestRef = doc(database, "purchaseRequests", requestId);
    
    let materialRef: any;
    if (existingMaterialId && existingMaterialId !== 'create_new') {
        materialRef = doc(database, "materials", existingMaterialId);
    } else {
        const requestSnap = await getDoc(requestRef);
        if(!requestSnap.exists()) throw new Error("Solicitud no encontrada");

        const materialsQuery = query(
            collection(database, "materials"),
            where("tenantId", "==", tenantId),
            where("name", "==", requestSnap.data()?.materialName)
        );
        const materialsSnap = await getDocs(materialsQuery);
        if (!materialsSnap.empty) {
            materialRef = materialsSnap.docs[0].ref;
        } else {
            materialRef = null;
        }
    }
    
    await runTransaction(database, async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists() || requestDoc.data().tenantId !== tenantId) {
            throw new Error("Solicitud de compra no encontrada o sin permisos.");
        }
        
        let materialDoc: any = null;
        if (materialRef) {
            materialDoc = await transaction.get(materialRef);
            if(materialDoc.exists() && materialDoc.data().tenantId !== tenantId) {
                throw new Error("No tienes permiso para modificar este material.");
            }
        }

        const requestData = requestDoc.data() as PurchaseRequest;
        const requestedQuantity = requestData.quantity;
        let newStock;

        if (receivedQuantity < requestedQuantity) {
            const remainingQuantity = requestedQuantity - receivedQuantity;
            transaction.update(requestRef, {
                quantity: remainingQuantity,
                status: 'approved',
                lotId: null,
                notes: `Recepción parcial de ${receivedQuantity}. Pendientes: ${remainingQuantity}. ${requestData.notes || ''}`.trim(),
            });

            const receivedRequestRef = doc(collection(database, "purchaseRequests"));
            transaction.set(receivedRequestRef, {
                ...requestData,
                quantity: receivedQuantity,
                originalQuantity: requestedQuantity,
                status: 'received',
                receivedAt: serverTimestamp(),
                notes: `Parte de la solicitud original ${requestId}.`,
                lotId: null,
            });
        } else {
            transaction.update(requestRef, {
                status: 'received',
                receivedAt: serverTimestamp(),
                quantity: receivedQuantity,
                originalQuantity: requestData.originalQuantity || requestedQuantity,
            });
        }

        if (materialDoc && materialDoc.exists()) {
            const currentStock = materialDoc.data()?.stock || 0;
            newStock = currentStock + receivedQuantity;
            transaction.update(materialRef, { stock: newStock });
        } else {
            materialRef = doc(collection(database, "materials"));
            newStock = receivedQuantity;
            transaction.set(materialRef, {
                id: materialRef.id,
                name: requestData.materialName,
                stock: newStock,
                unit: requestData.unit,
                category: requestData.category,
                tenantId: tenantId,
                supplierId: null,
                archived: false,
            });
        }
        
        const movementRef = doc(collection(database, "stockMovements"));
        transaction.set(movementRef, {
            materialId: materialRef.id,
            materialName: requestData.materialName,
            quantityChange: receivedQuantity,
            newStock: newStock,
            type: 'request-delivery',
            date: serverTimestamp(),
            justification: `Recepción de OC para solicitud ${requestId}`,
            userId: user.id,
            userName: user.name,
            relatedRequestId: requestId,
            tenantId: tenantId,
        });
    });
}


export async function deletePurchaseRequest(requestId: string, { tenantId }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `purchaseRequests`, requestId));
}

export async function generatePurchaseOrder(requests: PurchaseRequest[], supplierId: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    
    if (requests.length === 0) {
        throw new Error("No hay solicitudes para procesar en esta orden.");
    }
    const lotId = requests[0].lotId;
    if (!lotId) {
        throw new Error("Las solicitudes seleccionadas no pertenecen a un lote.");
    }

    const supplierDoc = await getDoc(doc(db, `suppliers`, supplierId));
    if (!supplierDoc.exists()) throw new Error("Proveedor no encontrado");
  
    const batch = writeBatch(db);
    const orderId = nanoid();
    const orderRef = doc(db, `purchaseOrders`, orderId);
  
    const itemsMap = new Map<string, {
      id: string;
      name: string;
      unit: string;
      totalQuantity: number;
      category: string;
    }>();

    for (const req of requests) {
        const key = req.materialName;
        if (itemsMap.has(key)) {
            itemsMap.get(key)!.totalQuantity += req.quantity;
        } else {
            itemsMap.set(key, {
              id: req.id,
              name: req.materialName,
              unit: req.unit,
              totalQuantity: req.quantity,
              category: req.category,
            });
        }
        const reqRef = doc(db, 'purchaseRequests', req.id);
        batch.update(reqRef, { status: 'ordered' });
    }
  
    // Crear la orden de cotización (purchaseOrder)
    batch.set(orderRef, {
      id: orderId,
      supplierId,
      supplierName: supplierDoc.data().name,
      createdAt: serverTimestamp(),
      creatorId: user.id,
      creatorName: user.name,
      status: 'generated', // This is a quote request, not a final OC
      requestIds: requests.map(r => r.id),
      items: Array.from(itemsMap.values()),
      tenantId,
      lotId,
    });
  
    // Actualizar el lote para asociarlo con el proveedor
    const lotRef = doc(db, 'purchaseLots', lotId);
    batch.update(lotRef, { 
      supplierId: supplierId,
    });
    
    await batch.commit();
    return orderId;
}

export async function createPurchaseOrder(
  { lotId, ocNumber, items, totalAmount }: { lotId: string; ocNumber: string; items: { requestId: string; price: number; quantity: number; name: string; unit: string; }[], totalAmount: number },
  { user, tenantId, db }: Context
): Promise<string> {
    if (!user || !tenantId) throw new Error("Autenticación requerida");

    const lotRef = doc(db, 'purchaseLots', lotId);
    
    return await runTransaction(db, async (transaction) => {
        const lotDoc = await transaction.get(lotRef);
        if (!lotDoc.exists()) {
            throw new Error("El lote especificado no existe.");
        }
        const lotData = lotDoc.data() as PurchaseLot;

        if (!lotData.supplierId) {
            throw new Error(`El lote ${lotId} no tiene un proveedor asociado. Por favor, genere una cotización primero desde el módulo de Compras.`);
        }

        const orderRef = doc(collection(db, "purchaseOrders"));
        
        let supplierName = '';
        const supplierDoc = await getDoc(doc(db, 'suppliers', lotData.supplierId));
        if (supplierDoc.exists()) {
            supplierName = supplierDoc.data().name;
        }

        const finalOC: Omit<PurchaseOrder, 'id'> & { id?: string } = {
            officialOCId: ocNumber,
            lotId,
            supplierId: lotData.supplierId,
            supplierName,
            createdAt: serverTimestamp() as any,
            creatorId: user.id,
            creatorName: user.name,
            status: 'issued', // Final OC
            items: [],
            totalAmount,
            tenantId,
        };
        
        finalOC.items = items.map(item => ({
          id: item.requestId,
          name: item.name,
          unit: item.unit,
          totalQuantity: item.quantity,
          price: item.price
        }));

        transaction.set(orderRef, finalOC);

        transaction.update(lotRef, { status: 'ordered' });

        for (const item of items) {
            const reqRef = doc(db, 'purchaseRequests', item.requestId);
            transaction.update(reqRef, {
                status: 'ordered',
                purchaseOrderId: orderRef.id,
                quantity: item.quantity,
            });
        }
        
        return orderRef.id;
    });
}


export async function returnToPool(
  requestIds: string[],
  { user, tenantId, db }: Context
) {
  if (!user || !tenantId) throw new Error("Autenticación requerida");

  const batch = writeBatch(db);
  
  requestIds.forEach(reqId => {
    const reqRef = doc(db, 'purchaseRequests', reqId);
    batch.update(reqRef, {
      status: 'approved', // Vuelve al estado aprobado
      lotId: null, // Se desvincula del lote
      notes: 'Devuelto a pendientes por Finanzas. Proveedor no cotizó.'
    });
  });

  await batch.commit();
}


export async function cancelPurchaseOrder(orderId: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("Autenticación requerida");

    const orderRef = doc(db, 'purchaseOrders', orderId);
    const batch = writeBatch(db);

    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
        throw new Error("La orden de cotización no existe.");
    }

    const orderData = orderDoc.data() as PurchaseOrder;

    // Reset all associated purchase requests
    if (orderData.requestIds && orderData.requestIds.length > 0) {
        const requestsQuery = query(collection(db, 'purchaseRequests'), where('__name__', 'in', orderData.requestIds));
        const requestsSnap = await getDocs(requestsQuery);
        requestsSnap.forEach(reqDoc => {
            batch.update(reqDoc.ref, { status: 'batched' }); // Or 'approved' if you want them out of the lot
        });
    }

    // Delete the purchase order
    batch.delete(orderRef);

    await batch.commit();
}

export async function archiveLot(requestIds: string[], { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("Autenticación requerida");
    const batch = writeBatch(db);
    requestIds.forEach(id => {
        const reqRef = doc(db, 'purchaseRequests', id);
        batch.update(reqRef, { status: 'ordered', notes: 'Archivado manualmente desde gestión de lotes.' });
    });
    await batch.commit();
}
