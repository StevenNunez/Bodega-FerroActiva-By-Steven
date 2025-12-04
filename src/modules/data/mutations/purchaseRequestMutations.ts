

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
  FieldValue
} from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { PurchaseRequest, Material, FirestoreWriteableDate } from '@/modules/core/lib/data';
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
    
    // Start with a clearly typed object
    const updateData: Partial<PurchaseRequest> = {
      ...data,
      status: status,
    };

    if (data.quantity !== undefined && data.quantity !== currentData.quantity && (currentData.originalQuantity === undefined || currentData.originalQuantity === null)) {
      updateData.originalQuantity = currentData.quantity;
    }

    // Conditionally add the server timestamp, using 'as any' for this specific override
    if (status === 'approved' && currentData.status !== 'approved') {
      updateData.approverId = user.id;
      updateData.approverName = user.name;
      (updateData as any).approvalDate = serverTimestamp();
    }

    transaction.update(requestRef, updateData);
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
    
    // Determinar la referencia al material ANTES de la transacción
    let materialRef: any;
    if (existingMaterialId) {
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
            // Si el material no existe, crearemos uno nuevo. No necesitamos una ref ahora.
            materialRef = null;
        }
    }
    
    await runTransaction(database, async (transaction) => {
        // --- FASE DE LECTURA ---
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

        // --- FASE DE ESCRITURA ---
        const requestData = requestDoc.data() as PurchaseRequest;
        const requestedQuantity = requestData.quantity;
        let newStock;

        // Caso 1: Recepción parcial
        if (receivedQuantity < requestedQuantity) {
            const remainingQuantity = requestedQuantity - receivedQuantity;
            transaction.update(requestRef, {
                quantity: remainingQuantity,
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
        } else { // Caso 2: Recepción completa o mayor
            transaction.update(requestRef, {
                status: 'received',
                receivedAt: serverTimestamp(),
            });
        }

        // Actualizar o crear el material
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
        
        // Registrar movimiento de stock
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

export async function cancelPurchaseOrder(orderId: string, { tenantId }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const batch = writeBatch(db);
    const orderRef = doc(db, `purchaseOrders`, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) throw new Error("Orden no encontrada");

    const requestIds = orderDoc.data().requestIds || [];
    for (const reqId of requestIds) {
        const reqRef = doc(db, `purchaseRequests`, reqId);
        batch.update(reqRef, { status: 'approved', lotId: null });
    }

    batch.update(orderRef, { status: 'cancelled' });
    await batch.commit();
}

export async function archiveLot(requestIds: string[], { tenantId }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const batch = writeBatch(db);
    requestIds.forEach(reqId => {
      const reqRef = doc(db, `purchaseRequests`, reqId);
      batch.update(reqRef, { status: 'ordered', lotId: null });
    });
    await batch.commit();
}

export async function generatePurchaseOrder(requests: PurchaseRequest[], supplierId: string, { user, tenantId }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
  
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
    }
  
    batch.set(orderRef, {
      id: orderId,
      supplierId,
      supplierName: supplierDoc.data().name,
      createdAt: serverTimestamp(),
      creatorId: user.id,
      creatorName: user.name,
      status: 'generated',
      requestIds: requests.map(r => r.id),
      items: Array.from(itemsMap.values()),
      tenantId,
    });
  
    // We will no longer change the status of requests here.
    // This will be done by the "archiveLot" function manually.
  
    await batch.commit();
    return orderId;
  }

    