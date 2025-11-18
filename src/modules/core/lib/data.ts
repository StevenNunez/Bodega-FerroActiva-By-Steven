
"use client";
import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "supervisor" | "worker" | "operations" | "apr" | "guardia" | "finance" | "super-admin" | "bodega-admin" | "cphs";

export interface Tenant {
  id: string;
  name: string;
  tenantId: string; // The unique identifier for the tenant (e.g., RUT)
  createdAt: Date | Timestamp;
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
  fechaIngreso?: Date | Timestamp | null;
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
  createdAt: Date | Timestamp;
  userName?: string;
  approvalDate?: Timestamp;
  rejectionDate?: Timestamp;
  deliveryDate?: Timestamp;
  approverId?: string;
  approverName?: string;
  notes?: string;
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
    createdAt: Timestamp;
    completionDate?: Timestamp;
    notes?: string;
    handlerId?: string; // ID of the admin who handled it
    handlerName?: string;
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
  createdAt: Date | Timestamp;
  receivedAt?: Date | Timestamp | null;
  category: string;
  area: string;
  lotId?: string | null;
  notes?: string | null;
  approverId?: string | null;
  approvalDate?: Date | Timestamp | null;
  requesterName?: string;
  approverName?: string;
}

export interface ToolLog {
  id: string;
  toolId: string;
  toolName: string;
  userId: string;
  userName: string;
  checkoutDate: Date | Timestamp;
  returnDate: Date | Timestamp | null;
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
  timestamp: Date | Timestamp;
  type: 'in' | 'out';
  method: 'qr' | 'manual';
  registrarId: string; // ID of the guard or admin who registered it
  registrarName: string;
  date: string; // YYYY-MM-DD for easy querying
  originalTimestamp?: Date | Timestamp | null;
  modifiedAt?: Date | Timestamp | null;
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
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplierName: string;
    createdAt: Date | Timestamp;
    creatorId: string;
    creatorName: string;
    status: 'generated' | 'sent' | 'completed' | 'cancelled';
    requestIds?: string[];
    items: { id: string; name: string; quantity: number, unit: string, totalQuantity: number }[];
    lotId?: string | null;
    pdfUrl?: string;
    tenantId?: string;
}

export interface StockMovement {
    id: string;
    materialId: string;
    materialName: string;
    quantityChange: number; // Positive for entry, negative for exit
    newStock: number;
    type: 'manual-entry' | 'initial' | 'request-delivery' | 'return-reentry' | 'adjustment';
    date: Timestamp;
    justification: string;
    userId: string; // User who performed the action
    userName: string;
    relatedRequestId?: string;
}

export interface PurchaseLot {
    id: string;
    name: string;
    createdAt: Timestamp;
    creatorId: string;
    creatorName: string;
    status: 'open' | 'ordered';
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  items: Pick<ChecklistItem, 'element'>[];
  createdBy: string;
  createdAt: Date | Timestamp;
}

export interface AssignedSafetyTask {
    id: string;
    templateId: string;
    templateTitle: string;
    supervisorId: string;
    assignerId: string;
    assignerName: string;
    createdAt: Timestamp;
    status: 'assigned' | 'completed' | 'approved' | 'rejected';
    area: string; 
    items?: any[];
    observations?: string;
    evidencePhotos?: string[];
    performedBy?: any;
    completedAt?: Timestamp;
    reviewedBy?: {
        signature: string;
        date: Timestamp;
        name: string;
    };
    rejectionNotes?: string;
}

export interface BehaviorObservationItem {
  question: string;
  status: 'si' | 'no' | 'na' | null;
}

export interface BehaviorObservation {
    id: string;
    obra: string;
    workerId: string;
    workerName: string;
    workerRut: string;
    observationDate: Date | Timestamp;
    items: BehaviorObservationItem[];
    riskLevel: 'aceptable' | 'leve' | 'grave' | 'gravisimo' | null;
    feedback: string;
    observerSignature: string;
    workerSignature: string;
    observerId: string;
    observerName: string;
    createdAt: Date | Timestamp;
    evidencePhoto?: string;
}

export interface ChecklistItem {
  element: string;
  yes: boolean;
  no: boolean;
  na: boolean;
  responsibleUserId: string;
  completionDate: Date | Timestamp | null;
}

export interface SafetyInspection {
    id: string;
    inspectorId: string;
    inspectorName: string;
    inspectorRole: UserRole;
    date: Timestamp;
    area: string;
    location?: string;
    description: string;
    riskLevel: 'leve' | 'grave' | 'fatal';
    actionPlan?: string;
    evidencePhotoUrl?: string;
    evidencePhotos?: string[];
    assignedTo: string;
    deadline?: Timestamp;
    status: 'open' | 'in-progress' | 'completed' | 'approved' | 'rejected';
    completionNotes?: string;
    completionExecutor?: string;
    completionPhotos?: string[];
    completedAt?: Timestamp;
    completionSignature?: string;
    reviewedBy?: {
        id: string;
        name: string;
        signature: string;
        date: Timestamp;
    };
    rejectionNotes?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: Date | Timestamp;
  dueDate: Date | Timestamp;
  status: 'pending' | 'paid' | 'overdue';
  createdAt?: Date | Timestamp;
  purchaseOrderNumber?: string;
  work?: string; // Obra
  paymentDate?: Date | Timestamp;
  paymentMethod?: string;
  pdfURL?: string;
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
