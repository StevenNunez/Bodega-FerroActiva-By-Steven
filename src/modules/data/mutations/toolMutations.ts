
import {
  doc,
  collection,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  limit,
  writeBatch
} from 'firebase/firestore';
import { nanoid } from 'nanoid';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function addTool(name: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const toolRef = collection(db, `tenants/${tenantId}/tools`);
  const qrCode = `TOOL-${nanoid(10).toUpperCase()}`;
  await addDoc(toolRef, {
    name,
    qrCode,
    status: 'available',
    tenantId,
  });
}

export async function updateTool(toolId: string, data: any, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const toolRef = doc(db, `tenants/${tenantId}/tools`, toolId);
  await updateDoc(toolRef, data);
}

export async function deleteTool(toolId: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const toolRef = doc(db, `tenants/${tenantId}/tools`, toolId);
  await deleteDoc(toolRef);
}

export async function checkoutTool(toolId: string, userId: string, supervisorId: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const batch = writeBatch(db);

  const userQuery = query(collection(db, `tenants/${tenantId}/users`), where("id", "==", userId));
  const supervisorQuery = query(collection(db, `tenants/${tenantId}/users`), where("id", "==", supervisorId));
  const toolQuery = query(doc(db, `tenants/${tenantId}/tools`, toolId) as any);
  
  const [userSnap, supervisorSnap, toolSnap] = await Promise.all([getDocs(userQuery), getDocs(supervisorQuery), getDocs(toolQuery)]);

  const userName = userSnap.docs[0]?.data()?.name || 'Desconocido';
  const supervisorName = supervisorSnap.docs[0]?.data()?.name || 'Desconocido';
  const toolName = toolSnap.docs[0]?.data()?.name || 'Herramienta Desconocida';

  const toolRef = doc(db, `tenants/${tenantId}/tools`, toolId);
  batch.update(toolRef, { status: 'in-use' });

  const logRef = doc(collection(db, `tenants/${tenantId}/toolLogs`));
  batch.set(logRef, {
    toolId,
    toolName,
    userId,
    userName,
    checkoutDate: serverTimestamp(),
    returnDate: null,
    checkoutSupervisorId: supervisorId,
    checkoutSupervisorName: supervisorName,
    tenantId,
  });
  
  await batch.commit();
}

export async function returnTool(logId: string, status: 'ok' | 'damaged', notes: string, { user, tenantId, db }: Context) {
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
  const logRef = doc(db, `tenants/${tenantId}/toolLogs`, logId);
  
  await runTransaction(db, async (transaction) => {
    const logDoc = await transaction.get(logRef);
    if (!logDoc.exists()) throw new Error("Registro no encontrado");
    
    const toolId = logDoc.data()?.toolId;
    if (!toolId) throw new Error("No se pudo encontrar la herramienta asociada al registro.");

    const toolRef = doc(db, `tenants/${tenantId}/tools`, toolId);
    transaction.update(toolRef, { status: status === 'ok' ? 'available' : 'maintenance' });

    transaction.update(logRef, {
      returnDate: serverTimestamp(),
      returnStatus: status,
      returnNotes: notes,
      returnSupervisorId: user.id,
      returnSupervisorName: user.name,
    });
  });
}

export async function findActiveLogForTool(toolId: string, { tenantId, db }: Context) {
  if (!tenantId) throw new Error("Inquilino no válido.");
  const logRef = collection(db, `tenants/${tenantId}/toolLogs`);
  const q = query(
    logRef,
    where('toolId', '==', toolId),
    where('returnDate', '==', null),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}
