

import {
  doc,
  collection,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  query,
  where,
  getDocs,
  setDoc,
  FieldValue,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/modules/core/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ROLES as ROLES_DEFAULT, Permission, PLANS } from '@/modules/core/lib/permissions';
import { nanoid } from 'nanoid';
import type { UserRole, Tenant, WorkItem, ProgressLog, PaymentState } from '@/modules/core/lib/data';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

// --- Tenant ---
export async function addTenant({ tenantName, tenantId, adminName, adminEmail }: any, { db }: Context) {
    // This function requires admin privileges not available on the client.
    // This is a placeholder for a secure backend function.
    console.warn("Tenant creation simulated. In production, this would be a secure backend operation.");
    
    // Simulate creating a tenant document
    const tenantRef = doc(db, "tenants", tenantId);
    
    // Simulate creating the admin user (in real life, this is complex and needs backend)
    // const adminUserCredential = await createUserWithEmailAndPassword(auth, adminEmail, 'temp-password');
    // const adminUid = adminUserCredential.user.uid;
    // const adminUserRef = doc(db, 'users', adminUid);
    
    // const batch = writeBatch(db);
    // batch.set(tenantRef, { name: tenantName, tenantId, createdAt: serverTimestamp(), plan: 'pro' });
    // batch.set(adminUserRef, {
    //     id: adminUid,
    //     name: adminName,
    //     email: adminEmail,
    //     role: 'admin',
    //     tenantId: tenantId,
    //     qrCode: `USER-${adminUid}`,
    // });
    
    // await batch.commit();
}

export async function updateTenant(tenantId: string, data: Partial<Tenant>, { db }: Context) {
    const tenantRef = doc(db, `tenants`, tenantId);
    await updateDoc(tenantRef, data);
}

// --- User ---
export async function updateUser(userId: string, data: any, { db, tenantId }: Context) {
    const userRef = doc(db, `users`, userId);
    await updateDoc(userRef, data);
}

export async function deleteUser(userId: string, { db, tenantId }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    // Deleting auth user requires admin SDK, so we only delete the Firestore doc.
    await deleteDoc(doc(db, `users`, userId));
}


// --- Material ---
export async function addMaterial(data: any, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const { justification, ...materialData } = data;
    const materialColl = collection(db, `materials`);
    
    await runTransaction(db, async (transaction) => {
        const newMaterialRef = doc(materialColl);
        transaction.set(newMaterialRef, {
            ...materialData,
            tenantId,
        });

        if (data.stock > 0) {
            const movementRef = doc(collection(db, `stockMovements`));
            transaction.set(movementRef, {
                materialId: newMaterialRef.id,
                materialName: data.name,
                quantityChange: data.stock,
                newStock: data.stock,
                type: 'initial',
                date: serverTimestamp(),
                justification: justification || 'Stock inicial',
                userId: user.id,
                userName: user.name,
                tenantId,
            });
        }
    });
}

export async function addManualStockEntry(materialId: string, quantity: number, justification: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const materialRef = doc(db, `materials`, materialId);
    
    await runTransaction(db, async (transaction) => {
        const materialDoc = await transaction.get(materialRef);
        if (!materialDoc.exists()) throw new Error("Material no encontrado.");

        const currentStock = materialDoc.data().stock || 0;
        const newStock = currentStock + quantity;
        
        transaction.update(materialRef, { stock: newStock });

        const movementRef = doc(collection(db, `stockMovements`));
        transaction.set(movementRef, {
            materialId: materialId,
            materialName: materialDoc.data().name,
            quantityChange: quantity,
            newStock: newStock,
            type: 'manual-entry',
            date: serverTimestamp(),
            justification: justification,
            userId: user.id,
            userName: user.name,
            tenantId,
        });
    });
}

export async function updateMaterial(materialId: string, data: any, { user, tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
  
    const materialRef = doc(db, 'materials', materialId);
  
    await runTransaction(db, async (transaction) => {
      const materialDoc = await transaction.get(materialRef);
      if (!materialDoc.exists()) {
        throw new Error("El material no existe.");
      }
      
      const currentData = materialDoc.data();
      const { stock, ...otherData } = data;
  
      // Solo modifica el stock si el rol lo permite y el valor ha cambiado.
      const canEditStock = user?.role === 'super-admin' || user?.role === 'admin';
      if (canEditStock && stock !== undefined && stock !== currentData.stock) {
        const stockDifference = stock - currentData.stock;
        
        // No llamamos a update directamente, sino a la función que crea el movimiento.
        // Esto centraliza la lógica y respeta las reglas de seguridad.
        await addManualStockEntry(materialId, stockDifference, 'Ajuste desde panel de edición', { user, tenantId, db });
        
        // El stock ya se actualizó en `addManualStockEntry`, así que no lo incluimos en el `updatePayload` final.
        // Solo actualizaremos los otros campos.
      }
      
      let updatePayload: any = { ...otherData };
      if (data.categoryId) {
        const categoryDoc = await getDoc(doc(db, 'materialCategories', data.categoryId));
        if (categoryDoc.exists()) {
          updatePayload.category = categoryDoc.data().name;
        }
        delete updatePayload.categoryId; 
      }
      
      // Si hay algo que actualizar (además del stock que ya se manejó)
      if (Object.keys(updatePayload).length > 0) {
        transaction.update(materialRef, updatePayload);
      }
    });
  }

export async function deleteMaterial(materialId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `materials`, materialId));
}

// --- Categories & Units ---
export async function addMaterialCategory(name: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const ref = doc(collection(db, 'materialCategories'));
    await setDoc(ref, { id: ref.id, name, tenantId });
}

export async function updateMaterialCategory(id: string, name: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await updateDoc(doc(db, `materialCategories`, id), { name });
}

export async function deleteMaterialCategory(id: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `materialCategories`, id));
}

export async function addUnit(name: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const ref = doc(collection(db, 'units'));
    await setDoc(ref, { id: ref.id, name, tenantId });
}

export async function deleteUnit(id: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `units`, id));
}


// --- Suppliers ---
export async function addSupplier(data: any, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await addDoc(collection(db, `suppliers`), { ...data, tenantId });
}

export async function updateSupplier(id: string, data: any, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await updateDoc(doc(db, `suppliers`, id), data);
}

export async function deleteSupplier(id: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `suppliers`, id));
}

// --- Lots ---
export async function createLot(name: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const lotRef = collection(db, `purchaseLots`);
    await addDoc(lotRef, {
        name,
        createdAt: serverTimestamp(),
        creatorId: user.id,
        creatorName: user.name,
        status: 'open',
        tenantId,
    });
}

export async function addRequestToLot(requestId: string, lotId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const requestRef = doc(db, `purchaseRequests`, requestId);
    await updateDoc(requestRef, { lotId, status: 'batched' });
}

export async function removeRequestFromLot(requestId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const requestRef = doc(db, `purchaseRequests`, requestId);
    // Vuelve al estado 'approved' para que sea reconsiderado
    await updateDoc(requestRef, { lotId: null, status: 'approved' });
}

export async function deleteLot(lotId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const batch = writeBatch(db);
    
    // Reset requests in the lot
    const requestsQuery = query(collection(db, `purchaseRequests`), where('lotId', '==', lotId));
    const requestsSnap = await getDocs(requestsQuery);
    requestsSnap.forEach(reqDoc => {
        batch.update(reqDoc.ref, { lotId: null, status: 'approved' });
    });

    // Delete the lot
    const lotRef = doc(db, `purchaseLots`, lotId);
    batch.delete(lotRef);

    await batch.commit();
}


// --- Permissions ---
export async function updateRolePermissions(role: UserRole, permission: any, checked: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const roleRef = doc(db, "roles", role);
  
  await runTransaction(db, async (transaction) => {
    const roleDoc = await transaction.get(roleRef);
    const currentPermissions = roleDoc.exists() ? roleDoc.data().permissions : ROLES_DEFAULT[role]?.permissions || [];
    
    let newPermissions;
    if (checked) {
      newPermissions = [...new Set([...currentPermissions, permission])];
    } else {
      newPermissions = currentPermissions.filter((p: string) => p !== permission);
    }
    
    if (roleDoc.exists()) {
      transaction.update(roleRef, { permissions: newPermissions });
    } else {
      transaction.set(roleRef, { 
        description: ROLES_DEFAULT[role]?.description,
        permissions: newPermissions 
      });
    }
  });
}

export async function updatePlanPermissions(planId: string, permissions: Permission[], { db }: Context) {
    const planRef = doc(db, "subscriptionPlans", planId);
    await updateDoc(planRef, { allowedPermissions: permissions });
}

// --- Work Items ---
export async function addWorkItem(data: Omit<WorkItem, 'id' | 'tenantId' | 'progress' | 'path'>, { tenantId, user, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    if (!user) throw new Error("Usuario no autenticado.");

    const collRef = collection(db, `workItems`);
    const newDocRef = doc(collRef);

    let path = '';
    let parentPath = '';

    if (data.parentId) {
        const parentRef = doc(db, `workItems`, data.parentId);
        const parentDoc = await getDoc(parentRef);
        if (!parentDoc.exists()) throw new Error("El ítem padre no existe.");
        parentPath = parentDoc.data().path;
        
        const childrenQuery = query(collRef, where('tenantId', '==', tenantId), where('parentId', '==', data.parentId));
        const childrenSnap = await getDocs(childrenQuery);
        const nextIndex = childrenSnap.size + 1;
        path = `${parentPath}/${String(nextIndex).padStart(2, '0')}`;
    } else {
        // Es un ítem raíz (un "Contrato" para el contratista)
        const rootQuery = query(collRef, where('tenantId', '==', tenantId), where('assignedTo', '==', user.id), where('parentId', '==', null));
        const rootSnap = await getDocs(rootQuery);
        const nextIndex = rootSnap.size + 1;
        path = String(nextIndex).padStart(2, '0');
    }

    const newItem: Omit<WorkItem, 'id'> = {
        ...data,
        status: 'in-progress',
        tenantId,
        projectId: tenantId, 
        progress: 0,
        path: path,
        createdBy: user.id,
    };

    await setDoc(newDocRef, newItem);
}


export async function updateWorkItem(id: string, data: Partial<WorkItem>, { db }: Context) {
    const workItemRef = doc(db, 'workItems', id);
    await updateDoc(workItemRef, data);
}

export async function deleteWorkItem(id: string, { db }: Context) {
    await deleteDoc(doc(db, 'workItems', id));
}


export async function addWorkItemProgress(workItemId: string, quantity: number, date: Date, observations: string | undefined, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

    const workItemRef = doc(db, "workItems", workItemId);

    await runTransaction(db, async (transaction) => {
        const workItemDoc = await transaction.get(workItemRef);
        if (!workItemDoc.exists()) {
            throw new Error("La partida de trabajo no existe.");
        }
        const workItemData = workItemDoc.data() as WorkItem;

        // Fetch existing progress logs for this item
        const progressQuery = query(collection(db, 'progressLogs'), where('workItemId', '==', workItemId));
        const progressSnap = await getDocs(progressQuery);
        const existingQuantity = progressSnap.docs.reduce((sum, doc) => sum + doc.data().quantity, 0);
        
        const totalAdvanced = existingQuantity + quantity;
        if (totalAdvanced > workItemData.quantity) {
            throw new Error(`La cantidad total avanzada (${totalAdvanced}) no puede exceder la cantidad total de la partida (${workItemData.quantity}).`);
        }

        const newProgress = (totalAdvanced / workItemData.quantity) * 100;

        // Create new progress log
        const progressLogRef = doc(collection(db, "progressLogs"));
        const logData: Omit<ProgressLog, 'id'> = {
            tenantId,
            workItemId,
            date: Timestamp.fromDate(date),
            quantity,
            userId: user.id,
            userName: user.name,
            observations: observations || '',
        };
        transaction.set(progressLogRef, logData);

        // Update the work item's progress
        transaction.update(workItemRef, { progress: newProgress });
    });
}

export async function submitForQualityReview(workItemId: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const workItemRef = doc(db, "workItems", workItemId);
    await updateDoc(workItemRef, {
      status: 'pending-quality-review',
      actualEndDate: serverTimestamp(),
    });
}

export async function approveWorkItem(workItemId: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const workItemRef = doc(db, "workItems", workItemId);
    await updateDoc(workItemRef, {
      status: 'completed',
    });
}

export async function rejectWorkItem(workItemId: string, reason: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const workItemRef = doc(db, "workItems", workItemId);
    // Remove the line that resets progress to 0
    await updateDoc(workItemRef, {
      status: 'rejected',
      // Optionally, add a log for the rejection, but don't reset progress
    });
}

export async function addPaymentState(
    data: Omit<PaymentState, 'id'|'tenantId'|'createdAt'|'status'|'contractorId'|'contractorName'>,
    { user, tenantId, db }: Context
): Promise<string> {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    
    const collectionRef = collection(db, "paymentStates");
    const newDocRef = doc(collectionRef);

    const newPaymentState: Omit<PaymentState, 'id'> = {
        ...data,
        contractorId: user.id,
        contractorName: user.name,
        createdAt: serverTimestamp() as Timestamp,
        status: 'pending',
        tenantId,
    };

    await setDoc(newDocRef, newPaymentState);
    return newDocRef.id;
}
