
"use client";
import { Timestamp, FieldValue } from "firebase/firestore";

// This type is used when writing data to Firestore
export type FirestoreWriteableDate = Date | Timestamp | FieldValue;

export type UserRole = "admin" | "supervisor" | "worker" | "operations" | "apr" | "guardia" | "finance" | "super-admin" | "bodega-admin" | "cphs" | "jefe-terreno" | "quality" | "jefe-oficina-tecnica";

export interface Tenant {
  id: string;
  name: string;
  tenantId: string; // The unique identifier for the tenant (e.g., RUT)
  createdAt: Timestamp;
  plan?: 'basic' | 'pro' | 'enterprise';
}

export interface SubscriptionPlan {
  plan: 'basic' | 'pro' | 'enterprise';
  features: {
    basic: boolean;
    pro: boolean;
    enterprise: boolean;
  },
  maxUsers?: number;
  maxRequests?: number;
  storageLimitMB?: number;
  expiresAt?: Timestamp;
  allowedPermissions?: string[];
}

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  qrCode: string;
  tenantId: string; // ID of the company/tenant they belong to
  rut?: string;
  cargo?: string;
  phone?: string;
  fechaIngreso?: Date | null;
  baseSalary?: number; // Sueldo base
  afp?: string;
  tipoSalud?: 'Fonasa' | 'Isapre';
  cargasFamiliares?: number;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Tool {
  id: string;
  name:string;
  qrCode: string;
  status: 'available' | 'in-use' | 'maintenance';
}

export interface MaterialCategory {
    id: string;
    name: string;
}

export interface Material {
  id: string;
  name: string;
  stock: number;
  unit: string;
  category: string;
  supplierId?: string | null; // Preferred supplier
  archived?: boolean;
}

export interface MaterialRequest {
  id:string;
  items: {
    materialId: string;
    quantity: number;
  }[];
  area: string;
  supervisorId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  userName?: string;
  approvalDate?: Date;
  rejectionDate?: Date;
  deliveryDate?: Date;
  approverId?: string;
  approverName?: string;
  notes?: string;
  tenantId: string;
}

export interface ReturnRequest {
    id: string;
    supervisorId: string;
    supervisorName: string;
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    status: 'pending' | 'completed' | 'rejected';
    createdAt: Date;
    completionDate?: Date;
    notes?: string;
    handlerId?: string; // ID of the admin who handled it
    handlerName?: string;
    tenantId: string;
}

export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "received" | "ordered" | "batched";

export interface PurchaseRequest {
  id: string;
  materialName: string;
  quantity: number;
  originalQuantity?: number | null;
  unit: string;
  justification: string;
  supervisorId: string;
  status: PurchaseRequestStatus;
  createdAt: Date;
  receivedAt?: Date | null;
  category: string;
  area: string;
  lotId?: string | null;
  notes?: string | null;
  approverId?: string | null;
  approvalDate?: Date | null;
  requesterName?: string;
  approverName?: string;
  tenantId: string;
  purchaseOrderId?: string;
  rejectionReason?: string;
  rejectionDate?: Date;
}

export interface ToolLog {
  id: string;
  toolId: string;
  toolName: string;
  userId: string;
  userName: string;
  checkoutDate: Date;
  returnDate: Date | null;
  checkoutSupervisorId: string;
  checkoutSupervisorName: string;
  returnSupervisorId?: string;
  returnSupervisorName?: string;
  returnStatus?: 'ok' | 'damaged' | null;
  returnNotes?: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'in' | 'out';
  method: 'qr' | 'manual';
  registrarId: string; // ID of the guard or admin who registered it
  registrarName: string;
  date: string; // YYYY-MM-DD for easy querying
  originalTimestamp?: Date | null;
  modifiedAt?: Date | null;
  modifiedBy?: string | null; // User ID of the admin who modified it
}

export interface Supplier {
    id: string;
    name: string;
    categories: string[];
    rut?: string;
    bank?: string;
    accountType?: string;
    accountNumber?: string;
    email?: string;
    address?: string;
    phone?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplierName: string;
    createdAt: Date;
    creatorId: string;
    creatorName: string;
    status: 'generated' | 'sent' | 'completed' | 'cancelled' | 'issued';
    requestIds?: string[];
    items: { id: string; name: string; unit: string; totalQuantity: number; price?: number; }[];
    lotId?: string | null;
    pdfUrl?: string;
    officialOCId?: string; // ID for the final, confirmed OC
    processedAt?: Date;
    processedBy?: string;
    totalAmount?: number;
    tenantId: string;
}

export interface StockMovement {
    id: string;
    materialId: string;
    materialName: string;
    quantityChange: number; // Positive for entry, negative for exit
    newStock: number;
    type: 'manual-entry' | 'initial' | 'request-delivery' | 'return-reentry' | 'adjustment';
    date: Date;
    justification: string;
    userId: string; // User who performed the action
    userName: string;
    relatedRequestId?: string;
}

export interface PurchaseLot {
    id: string;
    name: string;
    createdAt: Date;
    creatorId: string;
    creatorName: string;
    status: 'open' | 'ordered';
    supplierId: string;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  items: Pick<ChecklistItem, 'element'>[];
  createdBy: string;
  createdAt: Date;
}

export interface AssignedSafetyTask {
    id: string;
    templateId: string;
    templateTitle: string;
    supervisorId: string;
    assignerId: string;
    assignerName: string;
    createdAt: Date;
    status: 'assigned' | 'completed' | 'approved' | 'rejected';
    area: string; 
    items?: any[];
    observations?: string;
    evidencePhotos?: string[];
    performedBy?: any;
    completedAt?: Date;
    reviewedBy?: {
        signature: string;
        date: Date;
        name: string;
    };
    rejectionNotes?: string;
}

export interface BehaviorObservation {
    id: string;
    obra: string;
    workerId: string;
    workerName: string;
    workerRut: string;
    observationDate: Date;
    items: BehaviorObservationItem[];
    riskLevel: 'aceptable' | 'leve' | 'grave' | 'gravisimo' | null;
    feedback: string;
    observerSignature: string;
    workerSignature: string;
    observerId: string;
    observerName: string;
    createdAt: Date;
    evidencePhoto?: string;
}

export interface BehaviorObservationItem {
  question: string;
  status: 'si' | 'no' | 'na' | null;
}

export interface ChecklistItem {
  element: string;
  yes: boolean;
  no: boolean;
  na: boolean;
  responsibleUserId: string;
  completionDate: Date | null;
}

export interface SafetyInspection {
    id: string;
    inspectorId: string;
    inspectorName: string;
    inspectorRole: UserRole;
    date: Date;
    area: string;
    location?: string;
    description: string;
    riskLevel: 'leve' | 'grave' | 'fatal';
    actionPlan?: string;
    evidencePhotoUrl?: string;
    evidencePhotos?: string[];
    assignedTo: string;
    deadline?: Date;
    status: 'open' | 'in-progress' | 'completed' | 'approved' | 'rejected';
    completionNotes?: string;
    completionExecutor?: string;
    completionPhotos?: string[];
    completedAt?: Date;
    completionSignature?: string;
    reviewedBy?: {
        id: string;
        name: string;
        signature: string;
        date: Date;
    };
    rejectionNotes?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  createdAt?: Date;
  purchaseOrderNumber?: string;
  work?: string; // Obra
  paymentDate?: Date;
  paymentMethod?: string;
  pdfURL?: string;
}

export interface SalaryAdvance {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  processedAt?: Date;
  approverId?: string;
  approverName?: string;
  rejectionReason?: string;
  tenantId: string;
}

export interface WorkItem {
    id: string;
    tenantId: string;
    projectId: string; // Main obra ID
    name: string;
    type: 'project' | 'phase' | 'subphase' | 'activity' | 'task';
    status: 'in-progress' | 'pending-quality-review' | 'completed' | 'rejected';
    parentId: string | null;
    path: string; // e.g., '01/02/03'
    progress: number; // 0-100
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    actualStartDate?: Date | null;
    actualEndDate?: Date | null;
    unit: string; // e.g., m2, m3, und
    quantity: number;
    unitPrice: number;
    assignedTo?: string | null;
    createdBy?: string;
}

export interface PaymentState {
    id: string;
    contractorId: string;
    contractorName: string;
    createdAt: Timestamp;
    totalValue: number;
    earnedValue: number;
    status: 'pending' | 'approved' | 'paid';
    items: WorkItem[];
    tenantId: string;
}

export interface ProgressLog {
  id: string;
  tenantId: string;
  workItemId: string;
  date: Timestamp;
  quantity: number;
  userId: string;
  userName: string;
  observations?: string;
  photoUrl?: string;
}


// This is a client-side only type, not stored in DB
export interface Checklist {
    id: string;
    title: string;
    items: {
        element: string;
        checked: boolean;
    }[];
    createdBy: string;
}

export const WORK_SCHEDULE = {
  weekdays: {
    start: '08:00',
    end: '18:00',
  },
  friday: {
    start: '08:00',
    end: '17:00',
  },
  saturday: {
    start: '08:00',
    end: '13:00',
  },
  lunchBreak: {
    start: '13:00',
    end: '14:00',
  },
};
