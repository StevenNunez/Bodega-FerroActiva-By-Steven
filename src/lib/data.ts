
import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "supervisor" | "worker" | "operations" | "apr";

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  qrCode: string;
}

export interface Tool {
  id: string;
  name:string;
  qrCode: string;
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
  materialId: string;
  quantity: number;
  area: string;
  supervisorId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date | Timestamp;
}

export type PurchaseRequestStatus = "pending" | "approved" | "rejected" | "received" | "ordered" | "batched";

export const PURCHASE_UNITS = ["un", "kg", "gl", "m", "m2", "m3", "L", "caja", "saco"];

export interface PurchaseRequest {
  id: string;
  materialName: string;
  quantity: number;
  unit: string;
  justification: string;
  supervisorId: string;
  status: PurchaseRequestStatus;
  createdAt: Date | Timestamp;
  receivedAt?: Date | Timestamp | null;
  category: string;
  area: string;
  lotId?: string | null;
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

export interface Supplier {
    id: string;
    name: string;
    categories: string[];
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    createdAt: Date | Timestamp;
    status: 'generated' | 'sent' | 'completed';
    requestIds: string[];
    items: { materialName: string; totalQuantity: number; unit: string; category: string }[];
}


export const MATERIAL_CATEGORIES = [
    "Fierros y Acero",
    "Eléctricos",
    "Agua y Gasfitería",
    "Madera y Tableros",
    "Hormigón y Cemento",
    "Pinturas y Adhesivos",
    "Seguridad",
    "EPP",
    "Herramientas Menores",
    "Fijaciones",
    "Sanitarios y Grifería",
    "Limpieza y Aseo",
    "Oficina y Papelería",
    "Misceláneos"
]