
import {
  doc,
  collection,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  FieldValue,
} from 'firebase/firestore';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function addSupplierPayment(data: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const collectionRef = collection(db, "supplierPayments");
  await addDoc(collectionRef, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    tenantId,
  });
}

export async function updateSupplierPayment(paymentId: string, data: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, "supplierPayments", paymentId);
  await updateDoc(docRef, data);
}

export async function markPaymentAsPaid(paymentId: string, details: { paymentDate: Date; paymentMethod: string; }, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, "supplierPayments", paymentId);
  await updateDoc(docRef, {
    status: 'paid',
    ...details
  });
}

export async function deleteSupplierPayment(paymentId: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const docRef = doc(db, "supplierPayments", paymentId);
  await deleteDoc(docRef);
}

export async function addSalaryAdvanceRequest(
  data: { workerId: string; workerName: string; amount: number; },
  { user, tenantId, db }: Context
) {
  if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");

  const salaryAdvancesRef = collection(db, "salaryAdvances");
  await addDoc(salaryAdvancesRef, {
    ...data,
    status: 'pending',
    requestedAt: serverTimestamp(),
    tenantId,
  });
}

export async function approveSalaryAdvance(
  advanceId: string,
  { user, tenantId, db }: Context
) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const advanceRef = doc(db, "salaryAdvances", advanceId);
    await updateDoc(advanceRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        approverId: user.id,
        approverName: user.name,
    });
}

export async function rejectSalaryAdvance(
  advanceId: string,
  { user, tenantId, db }: Context
) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const advanceRef = doc(db, "salaryAdvances", advanceId);
    await updateDoc(advanceRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        approverId: user.id,
        approverName: user.name,
    });
}
