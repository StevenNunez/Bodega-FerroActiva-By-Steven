
import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "supervisor" | "worker" | "operations" | "apr" | "guardia";

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  qrCode: string;
  // Payroll information
  rut?: string;
  cargo?: string;
  fechaIngreso?: Date | Timestamp;
  afp?: string;
  tipoSalud?: 'Fonasa' | 'Isapre';
  cargasFamiliares?: number;
}

export interface Tool {
  id: string;
  name:string;
  qrCode: string;
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
}

export interface MaterialRequest {
  id: string;
  items: {
    materialId: string;
    quantity: number;
  }[];
  area: string;
  supervisorId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date | Timestamp;
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
}


export interface Supplier {
    id: string;
    name: string;
    categories: string[];
    address?: string;
    contact?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    createdAt: Date | Timestamp;
    status: 'generated' | 'sent' | 'completed';
    requestIds: string[];
    items: { materialName: string; totalQuantity: number; unit: string; category: string }[];
}