
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
} from 'firebase/firestore';
import { db, auth } from '@/modules/core/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ROLES as ROLES_DEFAULT } from '@/modules/core/lib/permissions';
import { nanoid } from 'nanoid';
import type { UserRole } from '@/modules/core/lib/data';

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

// --- User ---
export async function updateUser(userId: string, data: any, { db, tenantId }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
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
            id: newMaterialRef.id,
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

export async function updateMaterial(materialId: string, data: any, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const materialRef = doc(db, `materials`, materialId);
    await updateDoc(materialRef, data);
}

export async function deleteMaterial(materialId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `materials`, materialId));
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


// --- Categories & Units ---
export async function addMaterialCategory(name: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await addDoc(collection(db, `materialCategories`), { name, tenantId });
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
    await addDoc(collection(db, `units`), { name, tenantId });
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
