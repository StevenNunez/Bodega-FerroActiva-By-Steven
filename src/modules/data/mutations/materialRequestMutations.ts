
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  addDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { MaterialRequest, Material, ReturnRequest } from '@/modules/core/lib/data';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function addMaterialRequest(
  requestData: {
    items: { materialId: string; quantity: number }[];
    area: string;
    supervisorId: string;
  },
  context: Context
) {
  const { user, tenantId, db } = context;
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');

  const requestRef = collection(db, "requests");
  await addDoc(requestRef, {
    ...requestData,
    status: 'pending',
    createdAt: serverTimestamp(),
    supervisorId: user.id,
    userName: user.name,
    tenantId, // ID del inquilino añadido aquí
  });
}

export async function updateMaterialRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  context: Context
) {
  const { user, tenantId, db } = context;
  if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

  const requestRef = doc(db, "requests", requestId);

  await runTransaction(db, async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    if (!requestDoc.exists()) throw new Error("La solicitud no existe.");

    const requestData = requestDoc.data() as MaterialRequest;
    
    if (requestData.tenantId !== tenantId) {
        throw new Error("No tienes permiso para modificar esta solicitud.");
    }

    const requesterDocRef = doc(db, "users", requestData.supervisorId);
    const requesterDoc = await getDoc(requesterDocRef);
    const requesterName = requesterDoc.exists() ? requesterDoc.data().name : 'Usuario Desconocido';

    if (status === 'approved') {
      const materialRefs = requestData.items.map(item => doc(db, "materials", item.materialId));
      const materialDocs = await Promise.all(materialRefs.map(ref => transaction.get(ref)));

      for (let i = 0; i < requestData.items.length; i++) {
        const item = requestData.items[i];
        const materialDoc = materialDocs[i];

        if (!materialDoc.exists()) {
          throw new Error(`El material con ID ${item.materialId} no fue encontrado.`);
        }
        
        if (materialDoc.data().tenantId !== tenantId) {
            throw new Error(`No tienes permiso para modificar el material ${materialDoc.data().name}.`);
        }

        const materialData = materialDoc.data() as Material;
        if (materialData.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${materialData.name}. Solicitado: ${item.quantity}, Disponible: ${materialData.stock}.`);
        }

        const newStock = materialData.stock - item.quantity;
        transaction.update(materialDoc.ref, { stock: newStock });

        const movementRef = doc(collection(db, "stockMovements"));
        transaction.set(movementRef, {
          materialId: item.materialId,
          materialName: materialData.name,
          quantityChange: -item.quantity,
          newStock: newStock,
          type: 'request-delivery',
          date: serverTimestamp(),
          justification: `Entrega para solicitud ${requestId}`,
          userId: requestData.supervisorId,
          userName: requesterName,
          relatedRequestId: requestId,
          tenantId,
        });
      }

      transaction.update(requestRef, {
        status: 'approved',
        approvalDate: serverTimestamp(),
        approverId: user.id,
        approverName: user.name,
      });

    } else { // status === 'rejected'
      transaction.update(requestRef, {
        status: 'rejected',
        rejectionDate: serverTimestamp(),
        approverId: user.id,
        approverName: user.name,
      });
    }
  });
}

export async function addReturnRequest(
    items: { materialId: string; quantity: number; materialName: string; unit: string }[],
    notes: string,
    { user, tenantId, db }: Context
) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    
    const batch = writeBatch(db);
    const returnRequestsRef = collection(db, "returnRequests");

    items.forEach(item => {
        const newReturnRef = doc(returnRequestsRef);
        batch.set(newReturnRef, {
            supervisorId: user.id,
            supervisorName: user.name,
            materialId: item.materialId,
            materialName: item.materialName,
            quantity: item.quantity,
            unit: item.unit,
            status: 'pending',
            createdAt: serverTimestamp(),
            notes: notes,
            tenantId,
        });
    });

    await batch.commit();
}

export async function updateReturnRequestStatus(
    requestId: string,
    status: 'completed' | 'rejected',
    { user, tenantId, db }: Context
) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

    const requestRef = doc(db, "returnRequests", requestId);

    await runTransaction(db, async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists()) throw new Error("La solicitud de devolución no existe.");

        const returnData = requestDoc.data() as ReturnRequest;
        
        if (returnData.tenantId !== tenantId) {
            throw new Error("No tienes permiso para modificar esta solicitud.");
        }

        if (status === 'completed') {
            const materialRef = doc(db, "materials", returnData.materialId);
            const materialDoc = await transaction.get(materialRef);
            if (!materialDoc.exists()) throw new Error("El material a devolver no existe en el inventario.");
            
            if (materialDoc.data().tenantId !== tenantId) {
                throw new Error(`No tienes permiso para modificar el material ${materialDoc.data().name}.`);
            }

            const materialData = materialDoc.data();
            const newStock = (materialData.stock || 0) + returnData.quantity;
            transaction.update(materialRef, { stock: newStock });

            const movementRef = doc(collection(db, "stockMovements"));
            transaction.set(movementRef, {
                materialId: returnData.materialId,
                materialName: returnData.materialName,
                quantityChange: returnData.quantity,
                newStock: newStock,
                type: 'return-reentry',
                date: serverTimestamp(),
                justification: `Devolución de solicitud ${requestId}`,
                userId: returnData.supervisorId,
                userName: returnData.supervisorName,
                relatedRequestId: requestId,
                tenantId,
            });
        }
        
        transaction.update(requestRef, {
            status: status,
            completionDate: serverTimestamp(),
            handlerId: user.id,
            handlerName: user.name,
        });
    });
}
