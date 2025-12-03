import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, Query } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { AttendanceLog } from '@/modules/core/lib/data';

export function useAttendanceLogs(tenantId: string | null) {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    if (tenantId === undefined) return;

    let q: Query;
    const collRef = collection(db, "attendanceLogs");

    if (tenantId === null) {
        q = query(collRef);
    } else {
        q = query(collRef, where("tenantId", "==", tenantId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
      setAttendanceLogs(data);
    }, (error) => {
      console.error(`Error fetching attendanceLogs for tenant ${tenantId}:`, error);
      setAttendanceLogs([]);
    });

    return () => unsub();
  }, [tenantId]);

  return attendanceLogs;
}
