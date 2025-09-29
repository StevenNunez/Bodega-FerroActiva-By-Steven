

"use client";

import * as React from "react";
import {
  User,
  Tool,
  Material,
  MaterialRequest,
  ToolLog,
  PurchaseRequest,
  PurchaseRequestStatus,
  Supplier,
  PurchaseOrder,
  MaterialCategory,
  AttendanceLog,
  WORK_SCHEDULE,
} from "@/lib/data";
import { nanoid } from "nanoid";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  writeBatch,
  where,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  type QueryConstraint,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseAuthUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// Helper to convert Firestore Timestamps to JS Date objects
const convertTimestamps = (data: any) => {
  const convert = (value: any): any => {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (Array.isArray(value)) {
      return value.map(convert);
    }
    if (value && typeof value === "object") {
      const newObj: { [key: string]: any } = {};
      for (const key in value) {
        newObj[key] = convert(value[key]);
      }
      return newObj;
    }
    return value;
  };
  return convert(data);
};

const normalizeString = (str: string) => {
  if (!str) return "";
  // Keeps only letters and numbers
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove non-alphanumeric characters
};


// App State Context
interface AppStateContextType {
  user: (User & { fb: FirebaseAuthUser }) | null;
  users: User[];
  tools: Tool[];
  materials: Material[];
  materialCategories: MaterialCategory[];
  requests: MaterialRequest[];
  toolLogs: ToolLog[];
  attendanceLogs: AttendanceLog[];
  purchaseRequests: PurchaseRequest[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  manualLots: string[];
  addTool: (toolName: string) => Promise<void>;
  updateTool: (toolId: string, data: Partial<Omit<Tool, "id" | "qrCode">>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Omit<User, "id" | "email" | "qrCode">>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRequest: (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  checkoutTool: (toolId: string, workerId: string, supervisorId: string) => Promise<void>;
  returnTool: (logId: string, condition: "ok" | "damaged", notes?: string) => Promise<void>;
  handleAttendanceScan: (userId: string) => Promise<void>;
  addManualAttendance: (userId: string, forDate: Date, time: string, type: 'in' | 'out') => Promise<void>;
  updateAttendanceLog: (logId: string, newTimestamp: Date, newType: 'in' | 'out', originalTimestamp: Date) => Promise<void>;
  deleteAttendanceLog: (logId: string) => Promise<void>;
  addMaterial: (material: Omit<Material, "id">) => Promise<void>;
  updateMaterial: (materialId: string, data: Partial<Omit<Material, "id">>) => Promise<void>;
  deleteMaterial: (materialId: string) => Promise<void>;
  addManualStockEntry: (materialId: string, quantity: number, justification: string) => Promise<void>;
  addMaterialCategory: (name: string) => Promise<void>;
  updateMaterialCategory: (id: string, name: string) => Promise<void>;
  deleteMaterialCategory: (id: string) => Promise<void>;
  addPurchaseRequest: (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => Promise<void>;
  updatePurchaseRequestStatus: (
    id: string,
    status: PurchaseRequestStatus,
    data?: Partial<Pick<PurchaseRequest, "materialName" | "quantity" | "notes" | "justification">>
  ) => Promise<void>;
  receivePurchaseRequest: (purchaseRequestId: string) => Promise<void>;
  generatePurchaseOrder: (requests: PurchaseRequest[], supplierId: string) => Promise<void>;
  cancelPurchaseOrder: (orderId: string) => Promise<void>;
  addSupplier: (name: string, categories: string[]) => Promise<void>;
  updateSupplier: (supplierId: string, data: Partial<Omit<Supplier, "id">>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  batchApprovedRequests: (requestIds: string[], options: { mode: "category" | "supplier" }) => Promise<void>;
  removeRequestFromLot: (requestId: string) => Promise<void>;
  addRequestToLot: (requestId: string, lotId: string) => Promise<void>;
  createLot: (lotName: string) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  notify: (message: string, variant?: "default" | "destructive" | "success") => void;
}

const AppStateContext = React.createContext<AppStateContextType | null>(null);

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [materialCategories, setMaterialCategories] = React.useState<MaterialCategory[]>([]);
  const [requests, setRequests] = React.useState<MaterialRequest[]>([]);
  const [toolLogs, setToolLogs] = React.useState<ToolLog[]>([]);
  const [attendanceLogs, setAttendanceLogs] = React.useState<AttendanceLog[]>([]);
  const [purchaseRequests, setPurchaseRequests] = React.useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([]);
  const [manualLots, setManualLots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // Notify function for consistent UX
  const notify = React.useCallback(
    (message: string, variant: "default" | "destructive" | "success" = "default") => {
      toast({
        variant: variant === "success" ? "default" : variant,
        title: variant === "success" ? "Éxito" : variant === "destructive" ? "Error" : "Notificación",
        description: message,
        className: variant === 'success' ? 'border-green-500' : ''
      });
    },
    [toast]
  );

  React.useEffect(() => {
    setLoading(true);
    const collections: { name: string; setter: React.Dispatch<React.SetStateAction<any[]>>; sortField?: string }[] = [
        { name: "users", setter: setUsers, sortField: "name" },
        { name: "tools", setter: setTools, sortField: "name" },
        { name: "materials", setter: setMaterials, sortField: "name" },
        { name: "materialCategories", setter: setMaterialCategories, sortField: "name" },
        { name: "suppliers", setter: setSuppliers, sortField: "name" },
        { name: "requests", setter: setRequests, sortField: "createdAt" },
        { name: "toolLogs", setter: setToolLogs, sortField: "checkoutDate" },
        { name: "attendanceLogs", setter: setAttendanceLogs, sortField: "timestamp" },
        { name: "purchaseRequests", setter: setPurchaseRequests, sortField: "createdAt" },
        { name: "purchaseOrders", setter: setPurchaseOrders, sortField: "createdAt" },
    ];

    const unsubscribes = collections.map(({ name, setter, sortField }) => {
      const collRef = collection(db, name);
      
      const queryConstraints: QueryConstraint[] = [];
      if (sortField) {
          queryConstraints.push(orderBy(sortField, "desc"));
      }
      
      const q = query(collRef, ...queryConstraints);
      
      return onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => convertTimestamps({ ...doc.data(), id: doc.id }));
          setter(data);
        },
        (err) => {
          console.error(`Error fetching ${name}:`, err);
          setError(`Error al cargar datos de ${name}.`);
        }
      );
    });

    setLoading(false);
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const checkAuthAndRole = (allowedRoles: string[]) => {
    if (!authUser) throw new Error("Acción no autorizada: usuario no autenticado.");
    if (!allowedRoles.includes(authUser.role)) {
      throw new Error(`Acción no autorizada: se requiere rol ${allowedRoles.join(" o ")}.`);
    }
  };

  const addTool = async (toolName: string) => {
    checkAuthAndRole(["admin"]);
    try {
      const newDocRef = doc(collection(db, "tools"));
      const normalizedToolName = normalizeString(toolName);
      await setDoc(newDocRef, {
        id: newDocRef.id,
        name: toolName,
        qrCode: `TOOL-${normalizedToolName}-${nanoid(4)}`,
      });
      notify("Herramienta agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const updateTool = async (toolId: string, data: Partial<Omit<Tool, "id" | "qrCode">>) => {
    checkAuthAndRole(["admin"]);
    try {
      if (!toolId) throw new Error("Tool ID is required");
      const toolRef = doc(db, "tools", toolId);
      await updateDoc(toolRef, data);
      notify("Herramienta actualizada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteTool = async (toolId: string) => {
    checkAuthAndRole(["admin"]);
    try {
      if (!toolId) throw new Error("Tool ID is required");
      const isToolInUse = toolLogs.some((log) => log.toolId === toolId && log.returnDate === null);
      if (isToolInUse) {
        throw new Error("No se puede eliminar una herramienta que está actualmente en uso.");
      }
      const toolRef = doc(db, "tools", toolId);
      await deleteDoc(toolRef);
      notify("Herramienta eliminada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const updateUser = async (userId: string, data: Partial<Omit<User, "id" | "email" | "qrCode">>) => {
    checkAuthAndRole(["admin"]);
    try {
      if (!userId) throw new Error("User ID is required");
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, data);
      notify("Usuario actualizado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar usuario: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    checkAuthAndRole(["admin"]);
    try {
      if (!userId) throw new Error("User ID is required");
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
      notify("Usuario eliminado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar usuario: " + err.message, "destructive");
      throw err;
    }
  };

  const addMaterial = async (material: Omit<Material, "id">) => {
    checkAuthAndRole(["admin", "operations"]);
    try {
      const batch = writeBatch(db);
      const newMaterialRef = doc(collection(db, "materials"));

      batch.set(newMaterialRef, { ...material, id: newMaterialRef.id });

      if (material.stock > 0 && authUser) {
        const newPurchaseRequestRef = doc(collection(db, "purchaseRequests"));
        batch.set(newPurchaseRequestRef, {
          id: newPurchaseRequestRef.id,
          materialName: material.name,
          quantity: material.stock,
          unit: material.unit,
          category: material.category,
          justification: "Ingreso Manual de Stock Inicial",
          area: "Bodega Central",
          supervisorId: authUser.id,
          status: "received",
          createdAt: Timestamp.now(),
          receivedAt: Timestamp.now(),
          lotId: null,
        });
      }

      await batch.commit();
      notify("Material agregado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar material: " + err.message, "destructive");
      throw err;
    }
  };

  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, "id">>) => {
    checkAuthAndRole(["admin", "operations"]);
    try {
      const materialRef = doc(db, "materials", materialId);
      await updateDoc(materialRef, {
        ...data,
        supplierId: data.supplierId === "ninguno" ? null : data.supplierId,
      });
      notify("Material actualizado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar material: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteMaterial = async (materialId: string) => {
    checkAuthAndRole(["admin"]);
    try {
      const materialRef = doc(db, "materials", materialId);
      const requestsQuery = query(collection(db, "requests"), where("items", "array-contains", { materialId }));
      const requestsSnapshot = await getDocs(requestsQuery);
       if (!requestsSnapshot.empty) {
        throw new Error("No se puede eliminar: El material está en uso en una o más solicitudes de material.");
      }
      
      const oldRequestsQuery = query(collection(db, "requests"), where("materialId", "==", materialId));
      const oldRequestsSnapshot = await getDocs(oldRequestsQuery);
      if (!oldRequestsSnapshot.empty) {
        throw new Error("No se puede eliminar: El material está en uso en una o más solicitudes (formato antiguo).");
      }
      
      await deleteDoc(materialRef);
      notify("Material eliminado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar material: " + err.message, "destructive");
      throw err;
    }
  };

  const addManualStockEntry = async (materialId: string, quantity: number, justification: string) => {
    checkAuthAndRole(["admin", "operations"]);
    try {
      if (!authUser) throw new Error("Acción no autorizada.");
      const materialRef = doc(db, "materials", materialId);
      const materialDoc = await getDoc(materialRef);
      if (!materialDoc.exists()) throw new Error("El material seleccionado no existe.");
      const material = materialDoc.data() as Material;

      const batch = writeBatch(db);
      const newStock = material.stock + quantity;
      batch.update(materialRef, { stock: newStock });

      const newPurchaseRequestRef = doc(collection(db, "purchaseRequests"));
      batch.set(newPurchaseRequestRef, {
        id: newPurchaseRequestRef.id,
        materialName: material.name,
        quantity: quantity,
        unit: material.unit,
        category: material.category,
        justification: `Ingreso Manual: ${justification}`,
        area: "Bodega Central",
        supervisorId: authUser.id,
        status: "received",
        createdAt: Timestamp.now(),
        receivedAt: Timestamp.now(),
        lotId: null,
      });

      await batch.commit();
      notify("Stock manual agregado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar stock manual: " + err.message, "destructive");
      throw err;
    }
  };

  const addMaterialCategory = async (name: string) => {
    checkAuthAndRole(["admin", "operations", "supervisor"]);
    try {
      const newDocRef = doc(collection(db, "materialCategories"));
      await setDoc(newDocRef, { name, id: newDocRef.id });
      notify("Categoría de material agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const updateMaterialCategory = async (id: string, name: string) => {
    checkAuthAndRole(["admin", "operations", "supervisor"]);
    try {
      const categoryRef = doc(db, "materialCategories", id);
      await updateDoc(categoryRef, { name });
      notify("Categoría de material actualizada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteMaterialCategory = async (id: string) => {
    checkAuthAndRole(["admin"]);
    try {
      const categoryRef = doc(db, "materialCategories", id);
      const categoryDoc = await getDoc(categoryRef);
      const category = categoryDoc.data() as MaterialCategory;

      const materialsWithCategory = await getDocs(
        query(collection(db, "materials"), where("category", "==", category.name))
      );
      if (!materialsWithCategory.empty) {
        throw new Error("No se puede eliminar: existen materiales asignados a esta categoría.");
      }

      const suppliersWithCategory = await getDocs(
        query(collection(db, "suppliers"), where("categories", "array-contains", category.name))
      );
      if (!suppliersWithCategory.empty) {
        throw new Error("No se puede eliminar: existen proveedores asignados a esta categoría.");
      }

      await deleteDoc(categoryRef);
      notify("Categoría de material eliminada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const addRequest = async (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => {
    checkAuthAndRole(["supervisor", "worker", "admin", "apr", "operations"]);
    try {
      const newDocRef = doc(collection(db, "requests"));
      await setDoc(newDocRef, {
        ...request,
        id: newDocRef.id,
        status: "pending",
        createdAt: Timestamp.now(),
      });
      notify("Solicitud de material agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar solicitud de material: " + err.message, "destructive");
      throw err;
    }
  };

  const approveRequest = async (requestId: string) => {
    checkAuthAndRole(["admin"]);
    try {
        const requestRef = doc(db, "requests", requestId);
        const requestDoc = await getDoc(requestRef);
        if (!requestDoc.exists()) throw new Error("Solicitud no encontrada");
        const request = requestDoc.data() as MaterialRequest;

        const batch = writeBatch(db);

        for (const item of request.items) {
            const materialRef = doc(db, "materials", item.materialId);
            const materialDoc = await getDoc(materialRef);
            if (!materialDoc.exists()) throw new Error(`Material con ID ${item.materialId} no encontrado.`);
            
            const material = materialDoc.data() as Material;
            if (material.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${material.name}. Solicitado: ${item.quantity}, Disponible: ${material.stock}`);
            }
            
            const newStock = material.stock - item.quantity;
            batch.update(materialRef, { stock: newStock });
        }

        batch.update(requestRef, { status: "approved" });
        await batch.commit();
        notify("Solicitud aprobada exitosamente. El stock ha sido actualizado.", "success");
    } catch (err: any) {
        notify("Error al aprobar solicitud: " + err.message, "destructive");
        throw err;
    }
  };


  const checkoutTool = async (toolId: string, workerId: string, supervisorId: string) => {
    checkAuthAndRole(["admin", "supervisor", "apr", "operations"]);
    try {
      const newDocRef = doc(collection(db, "toolLogs"));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        toolId,
        workerId,
        supervisorId,
        checkoutDate: Timestamp.now(),
        returnDate: null,
      });
      notify("Herramienta asignada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al asignar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const returnTool = async (logId: string, condition: "ok" | "damaged" = "ok", notes: string = "") => {
    checkAuthAndRole(["admin", "supervisor", "apr", "operations"]);
    try {
      const logRef = doc(db, "toolLogs", logId);
      await updateDoc(logRef, {
        returnDate: Timestamp.now(),
        returnCondition: condition,
        returnNotes: notes,
      });
      notify("Herramienta devuelta exitosamente.", "success");
    } catch (err: any) {
      notify("Error al devolver herramienta: " + err.message, "destructive");
      throw err;
    }
  };
  
  const handleAttendanceScan = async (userId: string) => {
    checkAuthAndRole(["admin", "guardia", "operations", "supervisor", "apr"]);
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            throw new Error("Usuario no encontrado en la base de datos.");
        }
        const user = userDoc.data() as User;
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Find the latest log for this user today, regardless of type
        const allLogsForUserToday = attendanceLogs
            .filter(log => log.userId === userId && log.date === today)
            .sort((a,b) => (b.timestamp as Timestamp).toMillis() - (a.timestamp as Timestamp).toMillis());
        
        const lastLog = allLogsForUserToday.length > 0 ? allLogsForUserToday[0] : null;

        const newLogType = !lastLog || lastLog.type === 'out' ? 'in' : 'out';
        
        const newLogRef = doc(collection(db, "attendanceLogs"));
        await setDoc(newLogRef, {
            id: newLogRef.id,
            userId: userId,
            userName: user.name,
            timestamp: Timestamp.now(),
            date: today,
            type: newLogType,
        });

        notify(`${newLogType === 'in' ? 'Entrada' : 'Salida'} registrada para ${user.name}.`, "success");
        
    } catch (err: any) {
      notify("Error al registrar asistencia: " + err.message, "destructive");
      throw err;
    }
  };

  const addManualAttendance = async (userId: string, forDate: Date, time: string, type: 'in' | 'out') => {
    checkAuthAndRole(["admin", "operations"]);
    if (!authUser) throw new Error("Usuario no autenticado.");
    
    try {
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("Usuario no encontrado.");
        
        const [hours, minutes] = time.split(':').map(Number);
        const newTimestamp = new Date(forDate);
        newTimestamp.setHours(hours, minutes, 0, 0);

        const newLogRef = doc(collection(db, "attendanceLogs"));
        await setDoc(newLogRef, {
            id: newLogRef.id,
            userId: userId,
            userName: user.name,
            timestamp: Timestamp.fromDate(newTimestamp),
            date: newTimestamp.toISOString().split('T')[0],
            type: type,
            modifiedAt: Timestamp.now(),
            modifiedBy: authUser.id,
        });
        notify("Registro manual añadido exitosamente.", "success");
    } catch (err: any) {
        notify("Error al añadir registro manual: " + err.message, "destructive");
        throw err;
    }
};

  const updateAttendanceLog = async (logId: string, newTimestamp: Date, newType: 'in' | 'out', originalTimestamp: Date) => {
    checkAuthAndRole(["admin", "operations"]);
    if (!authUser) throw new Error("Usuario no autenticado.");
    
    try {
        const logRef = doc(db, "attendanceLogs", logId);
        await updateDoc(logRef, {
            timestamp: Timestamp.fromDate(newTimestamp),
            type: newType,
            originalTimestamp: Timestamp.fromDate(originalTimestamp),
            modifiedAt: Timestamp.now(),
            modifiedBy: authUser.id,
        });
        notify("Registro de asistencia actualizado exitosamente.", "success");
    } catch (err: any) {
        notify("Error al actualizar el registro: " + err.message, "destructive");
        throw err;
    }
};

  const deleteAttendanceLog = async (logId: string) => {
    checkAuthAndRole(["admin", "operations"]);
    try {
      if (!logId) throw new Error("Log ID is required");
      const logRef = doc(db, "attendanceLogs", logId);
      await deleteDoc(logRef);
      notify("Registro de asistencia eliminado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar el registro: " + err.message, "destructive");
      throw err;
    }
  };

  const addPurchaseRequest = async (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => {
    checkAuthAndRole(["supervisor", "worker", "admin", "operations", "apr"]);
    if (!authUser) throw new Error("Usuario no autenticado.");
    try {
      const newDocRef = doc(collection(db, "purchaseRequests"));
      await setDoc(newDocRef, {
        ...request,
        id: newDocRef.id,
        supervisorId: authUser.id,
        status: "pending",
        createdAt: Timestamp.now(),
        receivedAt: null,
        lotId: null,
      });
      notify("Solicitud de compra agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar solicitud de compra: " + err.message, "destructive");
      throw err;
    }
  };

  const updatePurchaseRequestStatus = async (
    id: string,
    status: PurchaseRequestStatus,
    data?: Partial<Pick<PurchaseRequest, "materialName" | "quantity" | "notes" | "justification">>
  ) => {
    checkAuthAndRole(["operations", "admin"]);
    try {
      if (!authUser) throw new Error("Acción no autorizada.");
      const requestRef = doc(db, "purchaseRequests", id);
      const originalRequest = purchaseRequests.find((pr) => pr.id === id);
      if (!originalRequest) throw new Error("Solicitud original no encontrada.");

      // Prepare the data to be updated
      let updateData: any = { ...data };

      // Only update the status if it's different
      if (originalRequest.status !== status) {
        updateData.status = status;
        updateData.approvedById = authUser.id;
        updateData.approvedAt = Timestamp.now();
      }

      // If the quantity is being changed, record the original quantity
      if (data?.quantity && data.quantity !== originalRequest.quantity && originalRequest.originalQuantity === undefined) {
         updateData.originalQuantity = originalRequest.quantity;
      }
      
      await updateDoc(requestRef, updateData);
      notify("Solicitud de compra actualizada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar solicitud de compra: " + err.message, "destructive");
      throw err;
    }
  };


  const receivePurchaseRequest = async (purchaseRequestId: string) => {
    checkAuthAndRole(["admin"]);
    try {
      const reqRef = doc(db, "purchaseRequests", purchaseRequestId);
      const reqDoc = await getDoc(reqRef);
      if (!reqDoc.exists()) throw new Error("Solicitud de compra no encontrada");
      const req = reqDoc.data() as PurchaseRequest;

      if (!["approved", "batched", "ordered"].includes(req.status)) {
        throw new Error("La solicitud debe estar aprobada, en lote u ordenada para poder ser recibida.");
      }

      const materialsQuery = query(collection(db, "materials"), where("name", "==", req.materialName));
      const materialsSnapshot = await getDocs(materialsQuery);

      const batch = writeBatch(db);

      if (materialsSnapshot.empty) {
        const newMaterialRef = doc(collection(db, "materials"));
        batch.set(newMaterialRef, {
          id: newMaterialRef.id,
          name: req.materialName,
          stock: req.quantity,
          unit: req.unit,
          category: req.category,
          supplierId: null,
        });
      } else {
        const existingMaterialRef = materialsSnapshot.docs[0].ref;
        const existingMaterialData = materialsSnapshot.docs[0].data() as Material;
        batch.update(existingMaterialRef, { stock: existingMaterialData.stock + req.quantity });
      }

      batch.update(reqRef, { status: "received", receivedAt: Timestamp.now() });
      await batch.commit();
      notify("Solicitud de compra recibida exitosamente.", "success");
    } catch (err: any) {
      notify("Error al recibir solicitud de compra: " + err.message, "destructive");
      throw err;
    }
  };

 const generatePurchaseOrder = async (requests: PurchaseRequest[], supplierId: string) => {
    checkAuthAndRole(["operations"]);
    try {
        const batch = writeBatch(db);

        const newOrderRef = doc(collection(db, "purchaseOrders"));
        
        const itemMap = new Map<string, { totalQuantity: number; unit: string; category: string }>();
        for (const req of requests) {
            const key = `${req.materialName}__${req.unit}`;
            if (itemMap.has(key)) {
                itemMap.get(key)!.totalQuantity += req.quantity;
            } else {
                itemMap.set(key, { totalQuantity: req.quantity, unit: req.unit, category: req.category });
            }
        }

        batch.set(newOrderRef, {
            id: newOrderRef.id,
            supplierId,
            createdAt: Timestamp.now(),
            status: "generated",
            requestIds: requests.map((req) => req.id),
            items: Array.from(itemMap.entries()).map(([key, { totalQuantity, unit, category }]) => ({
                materialName: key.split("__")[0],
                totalQuantity,
                unit,
                category,
            })),
        });

        // Also change the status of the requests to "ordered"
        for (const req of requests) {
            const reqRef = doc(db, "purchaseRequests", req.id);
            batch.update(reqRef, { status: "ordered" });
        }

        await batch.commit();
        notify("Orden de compra generada exitosamente.", "success");
    } catch (err: any) {
        notify("Error al generar orden de compra: " + err.message, "destructive");
        throw err;
    }
};


  const cancelPurchaseOrder = async (orderId: string) => {
    checkAuthAndRole(["operations"]);
    try {
      const orderRef = doc(db, "purchaseOrders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("La orden de compra no existe.");
      }
      const orderData = orderDoc.data() as PurchaseOrder;

      const batch = writeBatch(db);

      for (const reqId of orderData.requestIds) {
        const reqRef = doc(db, "purchaseRequests", reqId);
        const reqDoc = await getDoc(reqRef);
        if (reqDoc.exists()) {
            batch.update(reqRef, { status: "batched" });
        }
      }

      batch.delete(orderRef);
      
      await batch.commit();
      notify("Orden de compra anulada. Las solicitudes han vuelto a su lote.", "success");
    } catch (err: any) {
      notify("Error al anular la orden de compra: " + err.message, "destructive");
      throw err;
    }
};

  const addSupplier = async (name: string, categories: string[]) => {
    checkAuthAndRole(["admin", "operations", "supervisor"]);
    try {
      const newDocRef = doc(collection(db, "suppliers"));
      await setDoc(newDocRef, { id: newDocRef.id, name, categories });
      notify("Proveedor agregado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const updateSupplier = async (supplierId: string, data: Partial<Omit<Supplier, "id">>) => {
    checkAuthAndRole(["admin", "operations", "supervisor"]);
    try {
      if (!supplierId) throw new Error("Supplier ID is required");
      const supplierRef = doc(db, "suppliers", supplierId);
      await updateDoc(supplierRef, data);
      notify("Proveedor actualizado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    checkAuthAndRole(["admin"]);
    try {
      if (!supplierId) throw new Error("Supplier ID is required");
      const isSupplierInUse = materials.some((m) => m.supplierId === supplierId);
      if (isSupplierInUse) {
        throw new Error("No se puede eliminar. El proveedor está asignado a uno o más materiales.");
      }
      const supplierRef = doc(db, "suppliers", supplierId);
      await deleteDoc(supplierRef);
      notify("Proveedor eliminado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const batchApprovedRequests = async (requestIds: string[], options: { mode: "category" | "supplier" }) => {
    checkAuthAndRole(["operations"]);
    try {
      const batch = writeBatch(db);
      const relevantRequests = purchaseRequests.filter((pr) => requestIds.includes(pr.id));

      if (options.mode === "category") {
        const groups = new Map<string, string>();
        for (const req of relevantRequests) {
          const lotCategory = `lot-${req.category.replace(/\s/g, "-")}`;
          if (!groups.has(lotCategory)) {
            groups.set(lotCategory, `${lotCategory}-${nanoid(4)}`);
          }
          const lotId = groups.get(lotCategory)!;
          const reqRef = doc(db, "purchaseRequests", req.id);
          batch.update(reqRef, { lotId, status: "batched" });
        }
      } else if (options.mode === "supplier") {
        const materialNames = [...new Set(relevantRequests.map((r) => r.materialName))];
        const materialToSupplierMap = new Map<string, string | null>();
        if (materialNames.length > 0) {
          const materialDocs = await getDocs(query(collection(db, "materials"), where("name", "in", materialNames)));
          materialDocs.docs.forEach((doc) => {
            const mat = doc.data() as Material;
            materialToSupplierMap.set(mat.name, mat.supplierId || null);
          });
        }

        for (const req of relevantRequests) {
          const supplierId = materialToSupplierMap.get(req.materialName);
          if (!supplierId) continue;
          const lotId = supplierId;
          const reqRef = doc(db, "purchaseRequests", req.id);
          batch.update(reqRef, { lotId, status: "batched" });
        }
      }

      await batch.commit();
      notify("Solicitudes agrupadas exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agrupar solicitudes: " + err.message, "destructive");
      throw err;
    }
  };

  const removeRequestFromLot = async (requestId: string) => {
    checkAuthAndRole(["operations"]);
    try {
      const requestRef = doc(db, "purchaseRequests", requestId);
      await updateDoc(requestRef, { lotId: null, status: "approved" });
      notify("Solicitud removida del lote exitosamente.", "success");
    } catch (err: any) {
      notify("Error al remover solicitud del lote: " + err.message, "destructive");
      throw err;
    }
  };

  const addRequestToLot = async (requestId: string, lotId: string) => {
    checkAuthAndRole(["operations"]);
    try {
      const requestRef = doc(db, "purchaseRequests", requestId);
      await updateDoc(requestRef, { lotId, status: "batched" });
      notify("Solicitud agregada al lote exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar solicitud al lote: " + err.message, "destructive");
      throw err;
    }
  };

  const createLot = async (lotName: string) => {
    checkAuthAndRole(["operations"]);
    try {
      const newLotId = `manual-${lotName.replace(/\s/g, "-").toLowerCase()}-${nanoid(4)}`;
      if (manualLots.includes(newLotId) || purchaseRequests.some((pr) => pr.lotId === newLotId)) {
        throw new Error("Ya existe un lote con este nombre.");
      }
      setManualLots((prev) => [...prev, newLotId]);
      notify("Lote creado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al crear lote: " + err.message, "destructive");
      throw err;
    }
  };

 const deleteLot = async (lotId: string) => {
    checkAuthAndRole(["operations"]);
    try {
        const batch = writeBatch(db);
        
        const q = query(collection(db, "purchaseRequests"), where("lotId", "==", lotId));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
            if (doc.data().status === 'batched') {
                batch.update(doc.ref, { status: "ordered" });
            }
        });

        if (lotId.startsWith("manual-")) {
            setManualLots(prev => prev.filter(id => id !== lotId));
        }

        await batch.commit();
        notify("Lote procesado y eliminado de la lista de activos.", "success");
    } catch (err: any) {
        notify("Error al procesar el lote: " + err.message, "destructive");
        throw err;
    }
};

  const contextValue = {
    user: authUser,
    users,
    tools,
    materials,
    materialCategories,
    requests,
    toolLogs,
    attendanceLogs,
    purchaseRequests,
    suppliers,
    purchaseOrders,
    manualLots,
    addTool,
    updateTool,
    deleteTool,
    updateUser,
    deleteUser,
    addRequest,
    approveRequest,
    checkoutTool,
    returnTool,
    handleAttendanceScan,
    addManualAttendance,
    updateAttendanceLog,
    deleteAttendanceLog,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addManualStockEntry,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    addPurchaseRequest,
    updatePurchaseRequestStatus,
    receivePurchaseRequest,
    generatePurchaseOrder,
    cancelPurchaseOrder,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    batchApprovedRequests,
    removeRequestFromLot,
    addRequestToLot,
    createLot,
    deleteLot,
    loading,
    error,
    notify,
  };

  return <AppStateContext.Provider value={contextValue}>{children}</AppStateContext.Provider>;
}

const AuthContext = React.createContext<{
  user: (User & { fb: FirebaseAuthUser }) | null;
  authLoading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
  reauthenticateAndChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  reauthenticateAndChangeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
} | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<(User & { fb: FirebaseAuthUser }) | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUser({ ...(userDoc.data() as User), fb: firebaseUser });
          } else {
            setUser(null);
             console.error("No user document found in Firestore for UID:", firebaseUser.uid);
            await signOut(auth); // Sign out if no user profile
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error("Auth state change error:", err);
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "No se pudo verificar tu sesión. " + err.message,
        });
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const reauthenticateAndChangePassword = async (currentPassword: string, newPassword: string) => {
    // This is a placeholder for the actual implementation which would require re-authentication.
    throw new Error("Password change functionality is not fully implemented in this example.");
  };

  const reauthenticateAndChangeEmail = async (currentPassword: string, newEmail: string) => {
     // This is a placeholder for the actual implementation which would require re-authentication.
    throw new Error("Email change functionality is not fully implemented in this example.");
  };

  const value = { user, authLoading, login, logout, sendPasswordReset, reauthenticateAndChangePassword, reauthenticateAndChangeEmail };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </AuthProvider>
  );
}

function useAppState() {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AppProviders, useAppState, useAuth };
