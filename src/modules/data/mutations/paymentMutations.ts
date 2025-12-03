
import {
  doc,
  collection,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function addSupplierPayment(data: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const collectionRef = collection(db, `tenants/${tenantId}/supplierPayments`);
  await addDoc(collectionRef, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    tenantId,
  });
}

export async function updateSupplierPayment(paymentId: string, data: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, `tenants/${tenantId}/supplierPayments`, paymentId);
  await updateDoc(docRef, data);
}

export async function markPaymentAsPaid(paymentId: string, details: { paymentDate: Date; paymentMethod: string; }, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, `tenants/${tenantId}/supplierPayments`, paymentId);
  await updateDoc(docRef, {
    status: 'paid',
    ...details
  });
}

export async function deleteSupplierPayment(paymentId: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, `tenants/${tenantId}/supplierPayments`, paymentId);
  await deleteDoc(docRef);
}
