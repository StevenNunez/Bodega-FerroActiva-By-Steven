
import {
  doc,
  collection,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { AssignedSafetyTask, ChecklistTemplate } from '../../core/lib/data';

type Context = {
  user: any;
  tenantId: string | null;
  db: any;
};

export async function addChecklistTemplate(template: Pick<ChecklistTemplate, 'title' | 'items'>, { user, tenantId, db }: Context) {
  if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
  const collectionRef = collection(db, `checklistTemplates`);
  await addDoc(collectionRef, {
    ...template,
    createdBy: user.id,
    createdAt: serverTimestamp(),
    tenantId,
  });
}

export async function deleteChecklistTemplate(templateId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `checklistTemplates`, templateId));
}

export async function assignChecklistToSupervisors(template: ChecklistTemplate, supervisorIds: string[], workArea: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const batch = writeBatch(db);
    supervisorIds.forEach(supervisorId => {
        const newTaskRef = doc(collection(db, `assignedChecklists`));
        const taskData = {
            templateId: template.id,
            templateTitle: template.title,
            supervisorId: supervisorId,
            assignerId: user.id,
            assignerName: user.name,
            createdAt: serverTimestamp(),
            status: 'assigned',
            area: workArea,
            items: template.items,
            tenantId,
        };
        batch.set(newTaskRef, taskData);
    });
    await batch.commit();
}

export async function completeAssignedChecklist(checklist: AssignedSafetyTask, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    const checklistRef = doc(db, `assignedChecklists`, checklist.id);
    await updateDoc(checklistRef, {
        ...checklist,
        status: 'completed',
        completedAt: serverTimestamp(),
    });
}

export async function reviewAssignedChecklist(checklistId: string, status: 'approved' | 'rejected', notes: string, signature: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error("No autenticado o sin inquilino.");
    const checklistRef = doc(db, `assignedChecklists`, checklistId);
    await updateDoc(checklistRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : null,
        reviewedBy: {
            id: user.id,
            name: user.name,
            signature,
            date: serverTimestamp()
        }
    });
}

export async function deleteAssignedChecklist(checklistId: string, { tenantId, db }: Context) {
    if (!tenantId) throw new Error("Inquilino no válido.");
    await deleteDoc(doc(db, `assignedChecklists`, checklistId));
}

export async function addSafetyInspection(data: any, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const inspectionRef = collection(db, `safetyInspections`);
    await addDoc(inspectionRef, {
        ...data,
        inspectorId: user.id,
        inspectorName: user.name,
        date: Timestamp.now(),
        status: 'open',
        tenantId,
    });
}

export async function completeSafetyInspection(inspectionId: string, data: any, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const inspectionRef = doc(db, `safetyInspections`, inspectionId);
    await updateDoc(inspectionRef, {
        ...data,
        status: 'completed',
        completedAt: Timestamp.now(),
        completionExecutor: user.name,
    });
}

export async function reviewSafetyInspection(inspectionId: string, status: 'approved' | 'rejected', notes: string, signature: string, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const inspectionRef = doc(db, `safetyInspections`, inspectionId);
    await updateDoc(inspectionRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : null,
        reviewedBy: {
            id: user.id,
            name: user.name,
            signature,
            date: Timestamp.now(),
        },
    });
}

export async function addBehaviorObservation(data: any, { user, tenantId, db }: Context) {
    if (!user || !tenantId) throw new Error('No autenticado o sin inquilino.');
    const collectionRef = collection(db, `behaviorObservations`);
    await addDoc(collectionRef, {
        ...data,
        observerId: user.id,
        observerName: user.name,
        createdAt: serverTimestamp(),
        tenantId,
    });
}
