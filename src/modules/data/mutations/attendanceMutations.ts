
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { format } from 'date-fns';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function handleAttendanceScan(qrCode: string, { user, tenantId, db }: Context) {
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
  if (user.role !== 'guardia' && user.role !== 'admin' && user.role !== 'super-admin') {
    throw new Error('No tienes permiso para registrar asistencia.');
  }

  const usersRef = collection(db, `tenants/${tenantId}/users`);
  const q = query(usersRef, where('qrCode', '==', qrCode));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código QR no válido o usuario no encontrado.');
  }

  const scannedUser = querySnapshot.docs[0].data();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const attendanceRef = collection(db, `tenants/${tenantId}/attendanceLogs`);
  const userTodayLogsQuery = query(
    attendanceRef,
    where('userId', '==', scannedUser.id),
    where('date', '==', todayStr),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const lastLogSnapshot = await getDocs(userTodayLogsQuery);
  const lastLog = lastLogSnapshot.empty ? null : lastLogSnapshot.docs[0].data();

  const newLogType = lastLog?.type === 'in' ? 'out' : 'in';

  await addDoc(attendanceRef, {
    userId: scannedUser.id,
    userName: scannedUser.name,
    timestamp: serverTimestamp(),
    type: newLogType,
    method: 'qr',
    registrarId: user.id,
    registrarName: user.name,
    date: todayStr,
    tenantId,
  });

  return { userName: scannedUser.name, type: newLogType };
}

export async function addManualAttendance(
  userId: string,
  date: Date,
  time: string,
  type: 'in' | 'out',
  { user, tenantId, db }: Context
) {
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');

  const [hours, minutes] = time.split(':').map(Number);
  const timestamp = new Date(date);
  timestamp.setHours(hours, minutes);

  const attendanceRef = collection(db, `tenants/${tenantId}/attendanceLogs`);
  const userDoc = await getDocs(query(collection(db, `tenants/${tenantId}/users`), where('id', '==', userId)));
  const userName = userDoc.docs.length > 0 ? userDoc.docs[0].data().name : 'Desconocido';

  await addDoc(attendanceRef, {
    userId,
    userName,
    timestamp: Timestamp.fromDate(timestamp),
    type,
    method: 'manual',
    registrarId: user.id,
    registrarName: user.name,
    date: format(date, 'yyyy-MM-dd'),
    tenantId,
  });
}

export async function updateAttendanceLog(
  logId: string,
  newTimestamp: Date,
  newType: 'in' | 'out',
  originalTimestamp: Date,
  { user, tenantId, db }: Context
) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const logRef = doc(db, `tenants/${tenantId}/attendanceLogs`, logId);
    await updateDoc(logRef, {
        timestamp: Timestamp.fromDate(newTimestamp),
        type: newType,
        originalTimestamp: Timestamp.fromDate(originalTimestamp),
        modifiedAt: serverTimestamp(),
        modifiedBy: user.id,
    });
}

export async function deleteAttendanceLog(logId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const logRef = doc(db, `tenants/${tenantId}/attendanceLogs`, logId);
    await deleteDoc(logRef);
}
