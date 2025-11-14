

import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "supervisor" | "worker" | "operations" | "apr" | "guardia" | "finance" | "super-admin" | "bodega-admin";

export interface Tenant {
  id: string;
  name: string;
  tenantId: string; // The unique identifier for the tenant (e.g., RUT)
  createdAt: Date | Timestamp;
}


export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  qrCode: string;
  tenantId: string; // ID of the company/tenant they belong to
  // Payroll information
  rut?: string;
  cargo?: string;
  fechaIngreso?: Date | Timestamp;
  afp?: string;
  tipoSalud?: 'Fonasa' | 'Isapre';
  cargasFamiliares?: number;
}

export interface Unit {
  id: string;
  name: string;
  tenantId: string;
}

export interface Tool {
  id: string;
  name:string;
  qrCode: string;
  tenantId: string;
}

export interface MaterialCategory {
    id: string;
    name: string;
    tenantId: string;
}

export interface Material {
  id: string;
  name: string;
  stock: number;
  unit: string;
  category: string;
  supplierId?: string | null; // Preferred supplier
  archived?: boolean;
  tenantId: string;
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
  tenantId: string;
}

export interface ReturnRequest {
    id: string;
    items: {
        materialId: string;
        quantity: number;
    }[];
    justification: string;
    supervisorId: string;
    status: "pending" | "approved";
    createdAt: Date | Timestamp;
    approvedAt?: Date | Timestamp | null;
    approvedBy?: string | null;
    tenantId: string;
}


export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "received" | "ordered" | "batched";

export const PURCHASE_UNITS = ["un", "kg", "gl", "m", "m2", "m3", "L", "caja", "saco"];

export const WORK_SCHEDULE = {
  weekdays: {
    start: "08:00",
    end: "18:00",
  },
  friday: {
    start: "08:00",
    end: "17:00",
  },
  lunchBreak: {
    start: "12:00",
    end: "13:00",
  }
};


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
  approvedById?: string | null;
  approvedAt?: Date | Timestamp | null;
  tenantId: string;
}

export interface ToolLog {
  id: string;
  toolId: string;
  workerId: string;
  checkoutDate: Date | Timestamp;
  returnDate: Date | Timestamp | null;
  supervisorId: string;
  returnCondition?: 'ok' | 'damaged';
  returnNotes?: string;
  tenantId: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date | Timestamp;
  type: 'in' | 'out';
  date: string; // YYYY-MM-DD for easy querying
  originalTimestamp?: Date | Timestamp | null;
  modifiedAt?: Date | Timestamp | null;
  modifiedBy?: string | null; // User ID of the admin who modified it
  tenantId: string;
}


export interface Supplier {
    id: string;
    name: string;
    tenantId: string; 
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
    createdAt: Date | Timestamp;
    status: 'generated' | 'sent' | 'completed';
    requestIds: string[];
    items: { materialName: string; totalQuantity: number; unit: string; category: string }[];
    tenantId: string;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  items: Pick<ChecklistItem, 'element'>[];
  createdBy: string; // User ID of APR
  createdAt: Date | Timestamp;
  tenantId: string;
}

export interface AssignedChecklist {
  id: string;
  templateId: string;
  templateTitle: string;
  supervisorId: string;
  assignedBy: string; // User ID of APR
  work: string;
  status: 'assigned' | 'in-progress' | 'completed' | 'rejected' | 'approved';
  createdAt: Date | Timestamp;
  completedAt?: Date | Timestamp | null;
  rejectionNotes?: string;
  // Denormalized/copied data
  items: ChecklistItem[];
  observations: string;
  evidencePhotos: string[]; // Array of data URIs
  performedBy: { name: string; role: string; signature: string; date: Date | Timestamp | null };
  reviewedBy: { name: string; role: string; signature: string; date: Date | Timestamp | null };
  tenantId: string;
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
    tenantId: string;
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
  createdBy: string; // User ID of APR, Admin, etc.
  work: string;
  location?: string;
  inspectorName: string;
  inspectorRole?: string;
  description: string;
  riskLevel: 'leve' | 'grave' | 'fatal';
  actionPlan: string;
  evidencePhotos: string[];
  createdAt: Date | Timestamp;

  // Assignment part
  assignedTo: string; // Supervisor User ID
  assignedAt?: Date | Timestamp;
  deadline?: Date | Timestamp | null;

  // Completion part
  status: 'open' | 'in-progress' | 'completed' | 'approved' | 'rejected';
  completionNotes?: string;
  completionExecutor?: string;
  completionPhotos?: string[];
  completedAt?: Date | Timestamp | null;
  completionSignature?: string;

  // Review part
  reviewedBy?: {
    id: string;
    name: string;
    signature: string;
    date: Date | Timestamp;
  };
  rejectionNotes?: string; // If APR rejects the completion
  tenantId: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date | Timestamp;
  status: 'pending' | 'paid';
  createdAt: Date | Timestamp;
  purchaseOrderNumber?: string;
  work?: string; // Obra
  paymentDate?: Date | Timestamp;
  paymentMethod?: string;
  tenantId: string;
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
    tenantId: string;
}
