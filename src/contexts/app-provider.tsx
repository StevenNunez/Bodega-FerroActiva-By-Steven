
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
  Unit,
  ChecklistTemplate,
  AssignedChecklist,
  ChecklistItem,
  SafetyInspection,
  SupplierPayment,
  Checklist,
  BehaviorObservation,
  Tenant,
  ReturnRequest,
  UserRole
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
  enableIndexedDbPersistence,
  type Query,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseAuthUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLES as ROLES_DEFAULT, Permission, getPermissionsForRole } from "@/lib/permissions";

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

const FERROACTIVA_TENANT_ID = 'YjA1ZDA5NTAtNGY1NC00MDdlLWEwM2EtZGQzMzVjZDA2M2Nh';
const FERROACTIVA_TENANT_NAME = 'FerroActiva';

// App State Context
interface AppStateContextType {
  user: (User & { fb: FirebaseAuthUser }) | null;
  users: User[];
  tools: Tool[];
  materials: Material[];
  materialCategories: MaterialCategory[];
  units: Unit[];
  requests: MaterialRequest[];
  returnRequests: ReturnRequest[];
  toolLogs: ToolLog[];
  attendanceLogs: AttendanceLog[];
  purchaseRequests: PurchaseRequest[];
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  purchaseOrders: PurchaseOrder[];
  manualLots: string[];
  checklistTemplates: ChecklistTemplate[];
  assignedChecklists: AssignedChecklist[];
  safetyInspections: SafetyInspection[];
  behaviorObservations: BehaviorObservation[];
  tenants: Tenant[];
  roles: typeof ROLES_DEFAULT;
  currentTenantId: string | null;
  setCurrentTenantId: (tenantId: string | null) => void;
  can: (permission: Permission) => boolean;
  updateRolePermissions: (role: keyof typeof ROLES_DEFAULT, permission: string, checked: boolean) => Promise<void>;
  addTenant: (tenantData: { tenantName: string; tenantId: string; adminName: string; adminEmail: string; }) => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<void>;
  addTool: (toolName: string) => Promise<void>;
  updateTool: (toolId: string, data: Partial<Omit<Tool, "id" | "qrCode">>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  saveAttendanceLog: (logData: Partial<AttendanceLog> & { forDate?: Date; forUser?: User }) => Promise<void>;
  deleteAttendanceLog: (logId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Omit<User, "id" | "email" | "qrCode">>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRequest: (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => Promise<void>;
  addReturnRequest: (request: Omit<ReturnRequest, "id" | "status" | "createdAt">) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  approveReturnRequest: (requestId: string) => Promise<void>;
  checkoutTool: (toolId: string, workerId: string, supervisorId: string) => Promise<void>;
  returnTool: (logId: string, condition: "ok" | "damaged", notes?: string) => Promise<void>;
  findActiveLogForTool: (toolId: string) => Promise<ToolLog | null>;
  handleAttendanceScan: (userId: string) => Promise<void>;
  addManualAttendance: (userId: string, forDate: Date, time: string, type: 'in' | 'out') => Promise<void>;
  updateAttendanceLog: (logId: string, newTimestamp: Date, newType: 'in' | 'out', originalTimestamp: Date) => Promise<void>;
  addMaterial: (material: Omit<Material, "id" | 'category'> & { categoryId: string; justification?: string }) => Promise<void>;
  updateMaterial: (materialId: string, data: Partial<Omit<Material, "id" | 'category'> & { categoryId?: string }>) => Promise<void>;
  deleteMaterial: (materialId: string) => Promise<void>;
  addManualStockEntry: (materialId: string, quantity: number, justification: string) => Promise<void>;
  addMaterialCategory: (name: string) => Promise<void>;
  updateMaterialCategory: (id: string, name: string) => Promise<void>;
  deleteMaterialCategory: (id: string) => Promise<void>;
  addUnit: (name: string) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  addPurchaseRequest: (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => Promise<void>;
  updatePurchaseRequestStatus: (
    id: string,
    status: PurchaseRequestStatus,
    data?: Partial<Pick<PurchaseRequest, "materialName" | "quantity" | "unit" | "notes" | "justification">>
  ) => Promise<void>;
  deletePurchaseRequest: (id: string) => Promise<void>;
  receivePurchaseRequest: (purchaseRequestId: string, receivedQuantity: number, existingMaterialId?: string) => Promise<void>;
  generatePurchaseOrder: (requests: PurchaseRequest[], supplierId: string) => Promise<void>;
  cancelPurchaseOrder: (orderId: string) => Promise<void>;
  addSupplier: (data: Partial<Omit<Supplier, 'id'>>) => Promise<string>;
  updateSupplier: (supplierId: string, data: Partial<Omit<Supplier, "id">>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  addChecklistTemplate: (template: Omit<ChecklistTemplate, "id" | "createdAt" | "createdBy">) => Promise<void>;
  deleteChecklistTemplate: (templateId: string) => Promise<void>;
  assignChecklistToSupervisors: (template: ChecklistTemplate, supervisorIds: string[], work: string) => Promise<void>;
  completeAssignedChecklist: (checklistData: AssignedChecklist) => Promise<void>;
  reviewAssignedChecklist: (checklistId: string, status: 'approved' | 'rejected', notes: string, signature: string) => Promise<void>;
  deleteAssignedChecklist: (checklistId: string) => Promise<void>;
  addChecklist: (checklist: Omit<Checklist, "id" | "createdBy">) => Promise<void>;
  addSafetyInspection: (inspection: Omit<SafetyInspection, "id" | "status" | "createdAt" | "createdBy">) => Promise<void>;
  completeSafetyInspection: (inspectionId: string, completionData: Pick<SafetyInspection, 'completionNotes' | 'completionSignature' | 'completionExecutor' | 'completionPhotos'>) => Promise<void>;
  reviewSafetyInspection: (inspectionId: string, status: 'approved' | 'rejected', notes: string, signature: string) => Promise<void>;
  addSupplierPayment: (payment: Omit<SupplierPayment, "id" | "createdAt" | "status">) => Promise<void>;
  updateSupplierPaymentStatus: (id: string, status: 'paid', details: { paymentDate: Date; paymentMethod: string }) => Promise<void>;
  updateSupplierPayment: (id: string, data: Partial<Pick<SupplierPayment, 'work' | 'purchaseOrderNumber'>>) => Promise<void>;
  addBehaviorObservation: (observation: Omit<BehaviorObservation, 'id' | 'observerId' | 'observerName' | 'createdAt'>) => Promise<void>;
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
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [requests, setRequests] = React.useState<MaterialRequest[]>([]);
  const [returnRequests, setReturnRequests] = React.useState<ReturnRequest[]>([]);
  const [toolLogs, setToolLogs] = React.useState<ToolLog[]>([]);
  const [attendanceLogs, setAttendanceLogs] = React.useState<AttendanceLog[]>([]);
  const [purchaseRequests, setPurchaseRequests] = React.useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = React.useState<SupplierPayment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([]);
  const [checklistTemplates, setChecklistTemplates] = React.useState<ChecklistTemplate[]>([]);
  const [assignedChecklists, setAssignedChecklists] = React.useState<AssignedChecklist[]>([]);
  const [safetyInspections, setSafetyInspections] = React.useState<SafetyInspection[]>([]);
  const [behaviorObservations, setBehaviorObservations] = React.useState<BehaviorObservation[]>([]);
  const [manualLots, setManualLots] = React.useState<string[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [roles, setRoles] = React.useState<typeof ROLES_DEFAULT>(ROLES_DEFAULT);
  const [currentTenantId, setCurrentTenantId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { can } = usePermissions(authUser?.role);

  React.useEffect(() => {
    if (authUser && authUser.role !== 'super-admin' && authUser.tenantId && !currentTenantId) {
      setCurrentTenantId(authUser.tenantId);
    }
  }, [authUser, currentTenantId]);

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
  
  const getTenantId = React.useCallback(() => {
    if (authUser?.role === 'super-admin') {
        return currentTenantId;
    }
    return authUser?.tenantId || null;
  }, [authUser, currentTenantId]);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
  
    if (!authUser) {
      setLoading(false);
      return;
    }

    const unsubRoles = onSnapshot(collection(db, "roles"), (snapshot) => {
        if (snapshot.empty) {
            const batch = writeBatch(db);
            Object.entries(ROLES_DEFAULT).forEach(([roleId, roleData]) => {
                const roleRef = doc(db, "roles", roleId);
                batch.set(roleRef, roleData);
            });
            batch.commit().then(() => setRoles(ROLES_DEFAULT));
        } else {
            const fetchedRoles = snapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data();
                return acc;
            }, {} as any);
            setRoles(fetchedRoles);
        }
    });

    const collectionsToLoad = [
        { name: 'users', setter: setUsers },
        { name: 'tools', setter: setTools },
        { name: 'materials', setter: setMaterials },
        { name: 'materialCategories', setter: setMaterialCategories },
        { name: 'units', setter: setUnits },
        { name: 'suppliers', setter: setSuppliers },
        { name: 'requests', setter: setRequests },
        { name: 'returnRequests', setter: setReturnRequests },
        { name: 'toolLogs', setter: setToolLogs },
        { name: 'attendanceLogs', setter: setAttendanceLogs },
        { name: 'purchaseRequests', setter: setPurchaseRequests },
        { name: 'supplierPayments', setter: setSupplierPayments },
        { name: 'purchaseOrders', setter: setPurchaseOrders },
        { name: 'checklistTemplates', setter: setChecklistTemplates },
        { name: 'assignedChecklists', setter: setAssignedChecklists },
        { name: 'safetyInspections', setter: setSafetyInspections },
        { name: 'behaviorObservations', setter: setBehaviorObservations },
    ];
    
    const unsubTenants = onSnapshot(query(collection(db, "tenants")), (snapshot) => {
        const tenantsList = snapshot.docs.map(doc => convertTimestamps({ ...doc.data(), id: doc.id })) as Tenant[];
        const ferroActivaTenant = {
            id: FERROACTIVA_TENANT_ID, 
            tenantId: FERROACTIVA_TENANT_ID,
            name: FERROACTIVA_TENANT_NAME,
            createdAt: new Date()
        };
        if (!tenantsList.some(t => t.id === FERROACTIVA_TENANT_ID)) {
            tenantsList.unshift(ferroActivaTenant);
        }
        tenantsList.sort((a,b) => a.name.localeCompare(b.name));
        setTenants(tenantsList);
    });

    const setupListener = (collectionName: string, setter: (data: any) => void): () => void => {
        const collRef = collection(db, collectionName);
        let q: Query;
    
        const tenantIdForQuery = getTenantId();

        if (!tenantIdForQuery && authUser.role === 'super-admin') {
            q = query(collRef);
        } else {
            q = query(collRef, where('tenantId', '==', tenantIdForQuery));
        }

        return onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => convertTimestamps({ ...doc.data(), id: doc.id }));
          setter(docs);
        }, (error) => {
          console.error(`[Firestore Error] Collection: ${collectionName}`, error);
          setError(`Error al cargar ${collectionName}`);
        });
    };

    const loadAllData = async () => {
      const unsubscribers = collectionsToLoad.map(({ name, setter }) => setupListener(name, setter));
      
      const firstLoadPromise = Promise.all(
        collectionsToLoad.map(({ name }) => {
            const tenantIdForQuery = getTenantId();
            let q: Query;
            const collRef = collection(db, name);
            if (!tenantIdForQuery && authUser.role === 'super-admin') {
                q = query(collRef);
            } else {
                q = query(collRef, where('tenantId', '==', tenantIdForQuery));
            }
            return getDocs(q);
        })
      );
    
      try {
        await firstLoadPromise;
      } catch (error) {
        console.error("Error during initial data fetch:", error);
        setError("Error de conexión al cargar datos iniciales.");
      } finally {
        setLoading(false);
      }

      return () => {
        unsubscribers.forEach(unsub => unsub());
        unsubTenants();
        unsubRoles();
      };
    };
    
    let cleanup = () => {
        unsubTenants();
        unsubRoles();
    };
    loadAllData().then(unsubFunc => {
      if(unsubFunc) cleanup = unsubFunc;
    });

    return () => cleanup();

}, [authUser, currentTenantId, getTenantId]);
  
  const updateRolePermissions = async (role: keyof typeof ROLES_DEFAULT, permission: string, checked: boolean) => {
      if (!can('permissions:manage')) throw new Error("No tienes permiso para gestionar permisos.");
      const roleRef = doc(db, "roles", role);
      
      const docSnap = await getDoc(roleRef);
      if (!docSnap.exists()) {
          throw new Error("El rol especificado no existe en la base de datos.");
      }

      const currentCapabilities: string[] = docSnap.data().capabilities || [];
      let newCapabilities: string[];

      if (checked) {
          if (!currentCapabilities.includes(permission)) {
              newCapabilities = [...currentCapabilities, permission];
          } else {
              return; // No changes needed
          }
      } else {
          newCapabilities = currentCapabilities.filter(p => p !== permission);
      }

      await updateDoc(roleRef, { capabilities: newCapabilities });
      
      setRoles(prevRoles => ({
        ...prevRoles,
        [role]: {
            ...prevRoles[role],
            capabilities: newCapabilities,
        },
      }));
  };


  const addTenant = async (tenantData: { tenantName: string; tenantId: string; adminName: string; adminEmail: string; }) => {
    if (!can('tenants:create')) throw new Error('No tienes permiso para crear suscriptores.');
    
    const tenantQuery = query(collection(db, 'tenants'), where('tenantId', '==', tenantData.tenantId));
    const existingTenants = await getDocs(tenantQuery);
    if (!existingTenants.empty) {
        throw new Error('Ya existe un suscriptor con este ID (RUT).');
    }

    const userQuery = query(collection(db, 'users'), where('email', '==', tenantData.adminEmail));
    const existingUsers = await getDocs(userQuery);
    if (!existingUsers.empty) {
        throw new Error('El correo electrónico del administrador ya está en uso.');
    }

    try {
        const batch = writeBatch(db);
        const newTenantRef = doc(collection(db, 'tenants'));
        batch.set(newTenantRef, {
            id: newTenantRef.id,
            name: tenantData.tenantName,
            tenantId: tenantData.tenantId,
            createdAt: Timestamp.now()
        });
        
        const newUserRef = doc(collection(db, 'users'));
        const qrCode = `USER-${newUserRef.id}`;
        
        batch.set(newUserRef, {
            id: newUserRef.id,
            name: tenantData.adminName,
            email: tenantData.adminEmail,
            role: 'admin',
            tenantId: tenantData.tenantId,
            qrCode: qrCode,
        });

        await batch.commit();

        notify("Suscriptor Creado.", "success");
    } catch(err: any) {
        notify('Error al crear el suscriptor: ' + err.message, 'destructive');
        throw err;
    }
  };


  const deleteTenant = async (tenantId: string) => {
    if (!can('tenants:delete')) throw new Error('No tienes permiso para eliminar suscriptores.');
    try {
        if (!tenantId) throw new Error("Tenant ID is required.");
        const tenantRef = doc(db, "tenants", tenantId);
        await deleteDoc(tenantRef);
        notify("Suscriptor eliminado.", "success");
    } catch (err: any) {
        notify('Error al eliminar suscriptor: ' + err.message, 'destructive');
        throw err;
    }
  };


  const addTool = async (toolName: string) => {
    if (!can('tools:create')) throw new Error('No tienes permiso para crear herramientas.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "tools"));
      const normalizedToolName = normalizeString(toolName);
      await setDoc(newDocRef, {
        id: newDocRef.id,
        name: toolName,
        qrCode: `TOOL-${normalizedToolName}-${nanoid(4)}`,
        tenantId,
      });
      notify("Herramienta agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const updateTool = async (toolId: string, data: Partial<Omit<Tool, "id" | "qrCode">>) => {
    if (!can('tools:edit')) throw new Error('No tienes permiso para editar herramientas.');
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
    if (!can('tools:delete')) throw new Error('No tienes permiso para eliminar herramientas.');
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
    if (!can('users:edit')) throw new Error('No tienes permiso para editar usuarios.');
    try {
        if (!userId) throw new Error("User ID is required");
        const userRef = doc(db, "users", userId);
        
        const updateData: { [key: string]: any } = { ...data };
        
        if ('fechaIngreso' in data) {
          if (data.fechaIngreso) {
            updateData.fechaIngreso = Timestamp.fromDate(new Date(data.fechaIngreso));
          } else {
            updateData.fechaIngreso = null;
          }
        }
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        await updateDoc(userRef, updateData);
        notify("Usuario actualizado exitosamente.", "success");
    } catch (err: any) {
        console.error("Error updating user:", err);
        notify("Error al actualizar usuario: " + err.message, "destructive");
        throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!can('users:delete')) throw new Error('No tienes permiso para eliminar usuarios.');
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

  const addMaterial = async (material: Omit<Material, "id" | 'category'> & { categoryId: string; justification?: string }) => {
    if (!can('materials:create')) throw new Error('No tienes permiso para crear materiales.');
    const tenantId = getTenantId();
    try {
        const categoryDoc = await getDoc(doc(db, "materialCategories", material.categoryId));
        if (!categoryDoc.exists()) throw new Error("Categoría no válida.");
        const categoryName = categoryDoc.data().name;

        const batch = writeBatch(db);
        const newMaterialRef = doc(collection(db, "materials"));

        const unitExists = units.some(u => u.name.toLowerCase() === material.unit.toLowerCase());
        if (!unitExists) {
            const newUnitRef = doc(collection(db, "units"));
            batch.set(newUnitRef, { name: material.unit, id: newUnitRef.id, tenantId });
        }

        const { justification, categoryId, ...materialData } = material;
        batch.set(newMaterialRef, { ...materialData, category: categoryName, id: newMaterialRef.id, tenantId });

        if (material.stock > 0 && authUser) {
            const newPurchaseRequestRef = doc(collection(db, "purchaseRequests"));
            batch.set(newPurchaseRequestRef, {
                id: newPurchaseRequestRef.id,
                materialName: material.name,
                quantity: material.stock,
                unit: material.unit,
                category: categoryName,
                justification: justification || "Ingreso de stock inicial",
                area: "Bodega Central",
                supervisorId: authUser.id,
                status: "received",
                createdAt: Timestamp.now(),
                receivedAt: Timestamp.now(),
                lotId: null,
                tenantId,
            });
        }

        await batch.commit();
        notify("Material agregado exitosamente.", "success");
    } catch (err: any) {
        notify("Error al agregar material: " + err.message, "destructive");
        throw err;
    }
  };
  
  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, "id" | 'category'> & { categoryId?: string }>) => {
    if (!can('materials:edit')) throw new Error('No tienes permiso para editar materiales.');
    const tenantId = getTenantId();
    try {
        const batch = writeBatch(db);
        const materialRef = doc(db, "materials", materialId);

        const updateData: Partial<Material> = {
            name: data.name,
            stock: data.stock,
            unit: data.unit,
            supplierId: data.supplierId === 'ninguno' ? null : data.supplierId,
        };
        
        if (!can('stock:add_manual')) {
            delete updateData.stock;
        }

        if (data.categoryId) {
            const categoryDoc = await getDoc(doc(db, "materialCategories", data.categoryId));
            if (categoryDoc.exists()) {
                updateData.category = categoryDoc.data().name;
            } else {
                throw new Error("Categoría seleccionada no válida.");
            }
        }

        if (data.unit) {
            const unitExists = units.some(u => u.name.toLowerCase() === data.unit!.toLowerCase());
            if (!unitExists) {
                const newUnitRef = doc(collection(db, "units"));
                batch.set(newUnitRef, { name: data.unit, id: newUnitRef.id, tenantId });
            }
        }
        
        batch.update(materialRef, updateData);

        await batch.commit();
        notify("Material actualizado exitosamente.", "success");
    } catch (err: any) {
        console.error("Error updating material:", err);
        notify("Error al actualizar material: " + err.message, "destructive");
        throw err;
    }
  };


  const deleteMaterial = async (materialId: string) => {
    if (!can('materials:delete')) throw new Error('No tienes permiso para eliminar materiales.');
    const tenantId = getTenantId();
    try {
        if (!materialId) throw new Error("ID de material requerido.");
        
        const materialRef = doc(db, "materials", materialId);
        
        const allRequests = await getDocs(query(collection(db, 'requests'), where('tenantId', '==', tenantId)));
        const requestUsingMaterial = allRequests.docs.some(doc => {
            const items = doc.data().items as { materialId: string, quantity: number }[] | undefined;
            return items?.some(item => item.materialId === materialId);
        });

        if (requestUsingMaterial) {
            throw new Error("No se puede eliminar: El material está en uso en una o más solicitudes de material.");
        }

        const oldRequestsQuery = query(collection(db, "requests"), where("materialId", "==", materialId), where('tenantId', '==', tenantId));
        const oldRequestsSnapshot = await getDocs(oldRequestsQuery);

        if (!oldRequestsSnapshot.empty) {
            throw new Error("No se puede eliminar: El material está en uso en una o más solicitudes (formato antiguo).");
        }
        
        const purchaseRequestQuery = query(collection(db, "purchaseRequests"), where("materialName", "==", (await getDoc(materialRef)).data()?.name), where('tenantId', '==', tenantId));
        const purchaseRequestSnapshot = await getDocs(purchaseRequestQuery);
        if (!purchaseRequestSnapshot.empty) {
            throw new Error("No se puede eliminar: El material está referenciado en solicitudes de compra.");
        }


        await deleteDoc(materialRef);
        notify("Material eliminado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al eliminar material: " + err.message, "destructive");
      throw err;
    }
  };

  const addManualStockEntry = async (materialId: string, quantity: number, justification: string) => {
    if (!can('stock:add_manual')) throw new Error('No tienes permiso para agregar stock manualmente.');
    const tenantId = getTenantId();
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
        tenantId,
      });

      await batch.commit();
      notify("Stock manual agregado exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar stock manual: " + err.message, "destructive");
      throw err;
    }
  };

  const addMaterialCategory = async (name: string) => {
    if (!can('categories:create')) throw new Error('No tienes permiso para crear categorías.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "materialCategories"));
      await setDoc(newDocRef, { name, id: newDocRef.id, tenantId });
      notify("Categoría de material agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const updateMaterialCategory = async (id: string, name: string) => {
    if (!can('categories:edit')) throw new Error('No tienes permiso para editar categorías.');
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
    if (!can('categories:delete')) throw new Error('No tienes permiso para eliminar categorías.');
    const tenantId = getTenantId();
    try {
      const categoryRef = doc(db, "materialCategories", id);
      const categoryDoc = await getDoc(categoryRef);
      const category = categoryDoc.data() as MaterialCategory;

      const materialsWithCategory = await getDocs(
        query(collection(db, "materials"), where("category", "==", category.name), where('tenantId', '==', tenantId))
      );
      if (!materialsWithCategory.empty) {
        throw new Error("No se puede eliminar: existen materiales asignados a esta categoría.");
      }

      const suppliersWithCategory = await getDocs(
        query(collection(db, "suppliers"), where("categories", "array-contains", category.name), where('tenantId', '==', tenantId))
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

  const addUnit = async (name: string) => {
    if (!can('units:create')) throw new Error('No tienes permiso para crear unidades.');
    const tenantId = getTenantId();
    try {
        const unitExists = units.some(u => u.name.toLowerCase() === name.toLowerCase());
        if (unitExists) {
            notify(`La unidad "${name}" ya existe.`, "default");
            return;
        }
        const newDocRef = doc(collection(db, "units"));
        await setDoc(newDocRef, { name, id: newDocRef.id, tenantId });
        notify("Unidad agregada exitosamente.", "success");
    } catch (err: any) {
        notify("Error al agregar unidad: " + err.message, "destructive");
        throw err;
    }
  };
  
  const deleteUnit = async (id: string) => {
    if (!can('units:delete')) throw new Error('No tienes permiso para eliminar unidades.');
    const tenantId = getTenantId();
    try {
        const unitRef = doc(db, "units", id);
        const unitDoc = await getDoc(unitRef);
        const unit = unitDoc.data() as Unit;
        
        const materialsWithUnit = await getDocs(query(collection(db, "materials"), where("unit", "==", unit.name), where('tenantId', '==', tenantId)));
        if (!materialsWithUnit.empty) {
          throw new Error("No se puede eliminar: la unidad está en uso en uno o más materiales.");
        }
        
        await deleteDoc(unitRef);
        notify("Unidad eliminada exitosamente.", "success");
    } catch (err: any) {
        notify("Error al eliminar la unidad: " + err.message, "destructive");
        throw err;
    }
  }


  const addRequest = async (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => {
    if (!can('material_requests:create')) throw new Error('No tienes permiso para crear solicitudes de material.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "requests"));
      await setDoc(newDocRef, {
        ...request,
        id: newDocRef.id,
        status: "pending",
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Solicitud de material agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar solicitud de material: " + err.message, "destructive");
      throw err;
    }
  };
  
  const addReturnRequest = async (request: Omit<ReturnRequest, "id" | "status" | "createdAt">) => {
    if (!can('material_requests:create')) throw new Error('No tienes permiso para crear devoluciones.'); // Assuming same permission for now
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "returnRequests"));
      await setDoc(newDocRef, {
        ...request,
        id: newDocRef.id,
        status: "pending",
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Solicitud de devolución enviada para confirmación.", "success");
    } catch (err: any) {
      notify("Error al enviar la solicitud de devolución: " + err.message, "destructive");
      throw err;
    }
  };

  const approveRequest = async (requestId: string) => {
    if (!can('material_requests:approve')) throw new Error('No tienes permiso para aprobar solicitudes de material.');
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
  
  const approveReturnRequest = async (requestId: string) => {
    if (!can('stock:add_manual')) throw new Error('No tienes permiso para confirmar devoluciones.'); // Re-using stock add permission
    try {
        const requestRef = doc(db, "returnRequests", requestId);
        const requestDoc = await getDoc(requestRef);
        if (!requestDoc.exists()) throw new Error("Solicitud de devolución no encontrada");
        const request = requestDoc.data() as ReturnRequest;

        const batch = writeBatch(db);

        for (const item of request.items) {
            const materialRef = doc(db, "materials", item.materialId);
            const materialDoc = await getDoc(materialRef);
            if (!materialDoc.exists()) throw new Error(`Material con ID ${item.materialId} no encontrado.`);
            
            const material = materialDoc.data() as Material;
            const newStock = material.stock + item.quantity;
            batch.update(materialRef, { stock: newStock });
        }

        batch.update(requestRef, { status: "approved", approvedAt: Timestamp.now(), approvedBy: authUser?.id });
        await batch.commit();
        notify("Devolución confirmada exitosamente. El stock ha sido actualizado.", "success");
    } catch (err: any) {
        notify("Error al confirmar la devolución: " + err.message, "destructive");
        throw err;
    }
  };


  const checkoutTool = async (toolId: string, workerId: string, supervisorId: string) => {
    if (!can('tools:checkout')) throw new Error('No tienes permiso para entregar herramientas.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "toolLogs"));
      await setDoc(newDocRef, {
        id: newDocRef.id,
        toolId,
        workerId,
        supervisorId,
        checkoutDate: Timestamp.now(),
        returnDate: null,
        tenantId,
      });
      notify("Herramienta asignada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al asignar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const returnTool = async (logId: string, condition: "ok" | "damaged" = "ok", notes: string = "") => {
    if (!can('tools:return')) throw new Error('No tienes permiso para devolver herramientas.');
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
  
  const findActiveLogForTool = async (toolId: string): Promise<ToolLog | null> => {
    const tenantId = getTenantId();
    try {
        const q = query(
            collection(db, 'toolLogs'),
            where('toolId', '==', toolId),
            where('returnDate', '==', null),
            where('tenantId', '==', tenantId)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        // Assuming only one active log per tool is possible
        const docData = querySnapshot.docs[0].data();
        return convertTimestamps({ ...docData, id: querySnapshot.docs[0].id }) as ToolLog;
    } catch (error) {
        console.error("Error finding active log for tool:", error);
        notify("Error al buscar la herramienta prestada: " + (error as Error).message, "destructive");
        return null;
    }
  };

  const handleAttendanceScan = async (userId: string) => {
    if (!can('attendance:register')) throw new Error('No tienes permiso para registrar asistencia.');
    const tenantId = getTenantId();
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            throw new Error("Usuario no encontrado en la base de datos.");
        }
        const user = userDoc.data() as User;
        
        if(user.tenantId !== tenantId) {
            throw new Error("El usuario no pertenece a esta obra/empresa.");
        }
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
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
            tenantId,
        });

        notify(`${newLogType === 'in' ? 'Entrada' : 'Salida'} registrada para ${user.name}.`, "success");
        
    } catch (err: any) {
      notify("Error al registrar asistencia: " + err.message, "destructive");
      throw err;
    }
  };
  
  const saveAttendanceLog = async (logData: Partial<AttendanceLog> & { forDate?: Date; forUser?: User }) => {
    if (!can('attendance:edit')) throw new Error('No tienes permiso para editar la asistencia.');
    if (!authUser) throw new Error('Usuario no autenticado.');

    const isEditing = Boolean(logData.id);

    try {
        if (isEditing) {
            // Update existing log
            const { id, timestamp, type } = logData;
            if (!id || !timestamp) throw new Error("Faltan datos para actualizar el registro.");
            
            const logRef = doc(db, "attendanceLogs", id);
            const originalLogDoc = await getDoc(logRef);
            const originalLog = originalLogDoc.data() as AttendanceLog;

            await updateDoc(logRef, {
                timestamp: Timestamp.fromDate(timestamp as Date),
                type,
                originalTimestamp: originalLog.timestamp,
                modifiedAt: Timestamp.now(),
                modifiedBy: authUser.id
            });
            notify("Registro actualizado.", "success");
        } else {
            // Create new log
            const { forUser, forDate, timestamp, type } = logData;
            if (!forUser || !forDate || !timestamp || !type) throw new Error("Faltan datos para crear el registro.");
            const tenantId = getTenantId();
            
            const newLogRef = doc(collection(db, "attendanceLogs"));
            await setDoc(newLogRef, {
                id: newLogRef.id,
                userId: forUser.id,
                userName: forUser.name,
                timestamp: Timestamp.fromDate(timestamp as Date),
                date: (timestamp as Date).toISOString().split('T')[0],
                type: type,
                modifiedAt: Timestamp.now(),
                modifiedBy: authUser.id,
                tenantId
            });
            notify("Nuevo registro añadido.", "success");
        }
    } catch (err: any) {
        notify("Error al guardar el registro: " + err.message, "destructive");
        throw err;
    }
  };

  const addManualAttendance = async (userId: string, forDate: Date, time: string, type: 'in' | 'out') => {
    if (!can('attendance:edit')) throw new Error('No tienes permiso para añadir registros manuales.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    
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
            tenantId,
        });
        notify("Registro manual añadido exitosamente.", "success");
    } catch (err: any) {
        notify("Error al añadir registro manual: " + err.message, "destructive");
        throw err;
    }
};

  const updateAttendanceLog = async (logId: string, newTimestamp: Date, newType: 'in' | 'out', originalTimestamp: Date) => {
    if (!can('attendance:edit')) throw new Error('No tienes permiso para editar la asistencia.');
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
    if (!can('attendance:delete')) throw new Error('No tienes permiso para eliminar registros.');
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
    if (!can('purchase_requests:create')) throw new Error('No tienes permiso para crear solicitudes de compra.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    try {
      const batch = writeBatch(db);
      const newDocRef = doc(collection(db, "purchaseRequests"));

      if (request.unit) {
          const unitExists = units.some(u => u.name.toLowerCase() === request.unit!.toLowerCase());
          if (!unitExists) {
            const newUnitRef = doc(collection(db, "units"));
            batch.set(newUnitRef, { name: request.unit, id: newUnitRef.id, tenantId });
          }
      }

      batch.set(newDocRef, {
        ...request,
        id: newDocRef.id,
        supervisorId: authUser.id,
        status: "pending",
        createdAt: Timestamp.now(),
        receivedAt: null,
        lotId: null,
        tenantId,
      });

      await batch.commit();

      notify("Solicitud de compra agregada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al agregar solicitud de compra: " + err.message, "destructive");
      throw err;
    }
  };

  const updatePurchaseRequestStatus = async (
    id: string,
    status: PurchaseRequestStatus,
    data?: Partial<Pick<PurchaseRequest, "materialName" | "quantity" | "unit" | "notes" | "justification">>
  ) => {
    if (!can('purchase_requests:approve')) throw new Error('No tienes permiso para aprobar/rechazar solicitudes.');
    if (!authUser) throw new Error("Acción no autorizada.");
    const tenantId = getTenantId();
    try {
      const requestRef = doc(db, "purchaseRequests", id);
      const originalRequest = purchaseRequests.find((pr) => pr.id === id);
      if (!originalRequest) throw new Error("Solicitud original no encontrada.");

      const batch = writeBatch(db);
      let updateData: any = { ...data };

      if (data?.unit) {
          const unitExists = units.some(u => u.name.toLowerCase() === data.unit!.toLowerCase());
          if (!unitExists) {
            const newUnitRef = doc(collection(db, "units"));
            batch.set(newUnitRef, { name: data.unit, id: newUnitRef.id, tenantId });
          }
      }

      if (originalRequest.status !== status) {
        updateData.status = status;
        updateData.approvedById = authUser.id;
        updateData.approvedAt = Timestamp.now();
      }

      if (data?.quantity && data.quantity !== originalRequest.quantity && originalRequest.originalQuantity === undefined) {
         updateData.originalQuantity = originalRequest.quantity;
      }
      
      batch.update(requestRef, updateData);
      await batch.commit();
      notify("Solicitud de compra actualizada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar solicitud de compra: " + err.message, "destructive");
      throw err;
    }
  };
  
  const deletePurchaseRequest = async (id: string) => {
    if (!can('purchase_requests:delete')) throw new Error('No tienes permiso para eliminar solicitudes.');
    try {
        const reqRef = doc(db, "purchaseRequests", id);
        await deleteDoc(reqRef);
        notify('Solicitud eliminada.', 'success');
    } catch (error: any) {
        notify('Error al eliminar la solicitud: ' + error.message, 'destructive');
        throw error;
    }
  }


 const receivePurchaseRequest = async (purchaseRequestId: string, receivedQuantity: number, existingMaterialId?: string) => {
    if (!can('stock:receive_order')) throw new Error('No tienes permiso para recibir órdenes.');
    const tenantId = getTenantId();
    try {
        const reqRef = doc(db, "purchaseRequests", purchaseRequestId);
        const reqDoc = await getDoc(reqRef);
        if (!reqDoc.exists()) throw new Error("Solicitud de compra no encontrada.");
        const req = reqDoc.data() as PurchaseRequest;

        if (req.status === 'received') {
            throw new Error("Esta solicitud ya ha sido marcada como recibida y procesada.");
        }

        const batch = writeBatch(db);
        let materialRef;

        if (existingMaterialId) {
            materialRef = doc(db, "materials", existingMaterialId);
            const materialDoc = await getDoc(materialRef);
            if (!materialDoc.exists()) throw new Error("El material existente seleccionado no fue encontrado.");
            const existingMaterialData = materialDoc.data() as Material;
            batch.update(materialRef, { stock: existingMaterialData.stock + receivedQuantity });
        } else {
            materialRef = doc(collection(db, "materials"));
            batch.set(materialRef, {
                id: materialRef.id, name: req.materialName, stock: receivedQuantity,
                unit: req.unit, category: req.category, supplierId: null, tenantId,
            });
        }
        
        const isPartial = receivedQuantity < req.quantity;
        const isOver = receivedQuantity > req.quantity;
        let finalNotes = req.notes || '';
        
        if (isPartial) {
            finalNotes = `Recepción parcial. Recibido: ${receivedQuantity} de ${req.quantity}. ${finalNotes}`.trim();
        } else if (isOver) {
             finalNotes = `Recepción con excedente. Recibido: ${receivedQuantity}, Pedido: ${req.quantity}. ${finalNotes}`.trim();
        }

        batch.update(reqRef, {
            status: "received",
            receivedAt: Timestamp.now(),
            notes: finalNotes,
            originalQuantity: req.quantity,
            quantity: receivedQuantity
        });

        if (isPartial) {
            const newReqRef = doc(collection(db, "purchaseRequests"));
            const remainingQuantity = req.quantity - receivedQuantity;
            batch.set(newReqRef, {
                ...req,
                id: newReqRef.id,
                quantity: remainingQuantity,
                status: "approved",
                createdAt: Timestamp.now(),
                receivedAt: null,
                notes: `Generado por faltante de OC #${req.id}. Pendiente: ${remainingQuantity}.`,
                originalQuantity: null,
                tenantId,
            });
            notify(`Recepción parcial registrada. Se creó una nueva solicitud por las ${remainingQuantity} unidades faltantes.`, "success");
        } else {
            notify("Recepción completa registrada exitosamente.", "success");
        }

        await batch.commit();

    } catch (err: any) {
        notify("Error al recibir la solicitud: " + err.message, "destructive");
        throw err;
    }
  };


 const generatePurchaseOrder = async (requests: PurchaseRequest[], supplierId: string) => {
    if (!can('orders:create')) throw new Error('No tienes permiso para crear órdenes de compra.');
    const tenantId = getTenantId();
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
            tenantId,
        });

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
    if (!can('orders:cancel')) throw new Error('No tienes permiso para anular órdenes de compra.');
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

  const addSupplier = async (data: Partial<Omit<Supplier, 'id'>>) => {
    if (!can('suppliers:create')) throw new Error('No tienes permiso para crear proveedores.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "suppliers"));
      await setDoc(newDocRef, { ...data, id: newDocRef.id, tenantId });
      notify("Proveedor agregado exitosamente.", "success");
      return newDocRef.id;
    } catch (err: any) {
      notify("Error al agregar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const updateSupplier = async (supplierId: string, data: Partial<Omit<Supplier, "id">>) => {
    if (!can('suppliers:edit')) throw new Error('No tienes permiso para editar proveedores.');
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
    if (!can('suppliers:delete')) throw new Error('No tienes permiso para eliminar proveedores.');
    const tenantId = getTenantId();
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

 const addChecklistTemplate = async (template: Omit<ChecklistTemplate, "id" | "createdAt" | "createdBy">) => {
    if (!can('safety_templates:create')) throw new Error('No tienes permiso para crear plantillas.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "checklistTemplates"));
      await setDoc(newDocRef, {
        ...template,
        id: newDocRef.id,
        createdBy: authUser.id,
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Plantilla de checklist creada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al crear la plantilla: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteChecklistTemplate = async (templateId: string) => {
    if (!can('safety_templates:delete')) throw new Error('No tienes permiso para eliminar plantillas.');
    try {
        if (!templateId) throw new Error("ID de plantilla requerido.");
        const templateRef = doc(db, "checklistTemplates", templateId);
        await deleteDoc(templateRef);
        notify("Plantilla eliminada exitosamente.", "success");
    } catch (err: any) {
        notify("Error al eliminar la plantilla: " + err.message, "destructive");
        throw err;
    }
  };
  
 const assignChecklistToSupervisors = async (template: ChecklistTemplate, supervisorIds: string[], work: string) => {
    if (!can('safety_checklists:assign')) throw new Error('No tienes permiso para asignar checklists.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    try {
        const batch = writeBatch(db);
        for (const supervisorId of supervisorIds) {
            const newDocRef = doc(collection(db, "assignedChecklists"));
            const items = template.items.map(item => ({ 
                element: item.element, 
                yes: false, no: false, na: false, 
                responsibleUserId: '', 
                completionDate: null 
            }));
            const assignedChecklist: AssignedChecklist = {
                id: newDocRef.id,
                templateId: template.id,
                templateTitle: template.title,
                supervisorId,
                assignedBy: authUser.id,
                work,
                status: 'assigned',
                createdAt: Timestamp.now(),
                items: items,
                observations: '',
                evidencePhotos: [],
                performedBy: { name: '', role: '', signature: '', date: null },
                reviewedBy: { name: '', role: '', signature: '', date: null },
                tenantId,
            };
            batch.set(newDocRef, assignedChecklist);
        }
        await batch.commit();
        notify(`Checklist asignado a ${supervisorIds.length} usuario(s).`, "success");
    } catch (err: any) {
        notify("Error al asignar el checklist: " + err.message, "destructive");
        throw err;
    }
};

  const completeAssignedChecklist = async (checklistData: AssignedChecklist) => {
    if (!can('safety_checklists:complete')) throw new Error('No tienes permiso para completar checklists.');
    try {
      const checklistRef = doc(db, "assignedChecklists", checklistData.id);
      await updateDoc(checklistRef, {
        ...checklistData,
        status: 'completed',
        completedAt: Timestamp.now(),
      });
      notify("Checklist enviado para revisión.", "success");
    } catch (err: any) {
        notify("Error al guardar el checklist: " + err.message, "destructive");
        throw err;
    }
  };
  
  const reviewAssignedChecklist = async (checklistId: string, status: 'approved' | 'rejected', notes: string, signature: string) => {
    if (!can('safety_checklists:review')) throw new Error('No tienes permiso para revisar checklists.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    try {
      const checklistRef = doc(db, "assignedChecklists", checklistId);
      await updateDoc(checklistRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : '',
        reviewedBy: {
            name: authUser.name,
            role: authUser.role,
            signature: signature,
            date: Timestamp.now()
        },
      });
      notify(`Checklist ${status === 'approved' ? 'aprobado' : 'rechazado'}.`, "success");
    } catch (err: any) {
        notify("Error al revisar el checklist: " + err.message, "destructive");
        throw err;
    }
  };

  const deleteAssignedChecklist = async (checklistId: string) => {
    if (!can('safety_checklists:delete')) throw new Error('No tienes permiso para eliminar checklists asignados.');
    try {
        if (!checklistId) throw new Error("ID de checklist asignado requerido.");
        const checklistRef = doc(db, "assignedChecklists", checklistId);
        await deleteDoc(checklistRef);
        notify("Checklist asignado eliminado exitosamente.", "success");
    } catch (err: any) {
        notify("Error al eliminar el checklist asignado: " + err.message, "destructive");
        throw err;
    }
  };

  const addChecklist = async (checklist: Omit<Checklist, "id" | "createdBy">) => {
      if (!can('safety_checklists:create')) throw new Error('No tienes permiso para crear checklists.');
      if (!authUser) throw new Error("Usuario no autenticado.");
      const tenantId = getTenantId();
      try {
        const newDocRef = doc(collection(db, "checklists"));
        await setDoc(newDocRef, {
            ...checklist,
            id: newDocRef.id,
            createdBy: authUser.id,
            tenantId,
        });
        notify("Checklist guardado exitosamente.", "success");
      } catch (err: any) {
          notify("Error al guardar el checklist: " + err.message, "destructive");
          throw err;
      }
  };
  
  const addSafetyInspection = async (inspection: Omit<SafetyInspection, "id" | "status" | "createdAt" | "createdBy">) => {
    if (!can('safety_inspections:create')) throw new Error('No tienes permiso para crear inspecciones.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "safetyInspections"));
      await setDoc(newDocRef, {
        ...inspection,
        id: newDocRef.id,
        createdBy: authUser.id,
        createdAt: Timestamp.now(),
        status: 'open',
        assignedAt: Timestamp.now(),
        tenantId,
      });
      notify("Inspección de seguridad guardada y asignada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al guardar la inspección: " + err.message, "destructive");
      throw err;
    }
  };
  
  const completeSafetyInspection = async (inspectionId: string, completionData: Pick<SafetyInspection, 'completionNotes' | 'completionSignature' | 'completionExecutor' | 'completionPhotos'>) => {
    if (!can('safety_inspections:complete')) throw new Error('No tienes permiso para completar inspecciones.');
    try {
        const inspectionRef = doc(db, "safetyInspections", inspectionId);
        await updateDoc(inspectionRef, {
            ...completionData,
            status: 'completed',
            completedAt: Timestamp.now(),
        });
        notify("Inspección completada y enviada para verificación final.", "success");
    } catch (err: any) {
        notify("Error al completar la inspección: " + err.message, "destructive");
        throw err;
    }
  };
  
  const reviewSafetyInspection = async (inspectionId: string, status: 'approved' | 'rejected', notes: string, signature: string) => {
    if (!can('safety_inspections:review')) throw new Error('No tienes permiso para revisar inspecciones.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    try {
      const inspectionRef = doc(db, "safetyInspections", inspectionId);
      await updateDoc(inspectionRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : '',
        reviewedBy: {
            id: authUser.id,
            name: authUser.name,
            signature: signature,
            date: Timestamp.now()
        },
      });
      notify(`Inspección ${status === 'approved' ? 'aprobada' : 'rechazada'}.`, "success");
    } catch (err: any) {
        notify("Error al revisar la inspección: " + err.message, "destructive");
        throw err;
    }
  };
  
   const addSupplierPayment = async (payment: Omit<SupplierPayment, "id" | "createdAt" | "status">) => {
    if (!can('payments:create')) throw new Error('No tienes permiso para registrar pagos.');
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "supplierPayments"));
      await setDoc(newDocRef, {
        ...payment,
        id: newDocRef.id,
        status: "pending",
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Pago a proveedor registrado.", "success");
    } catch (err: any) {
      notify("Error al registrar el pago: " + err.message, "destructive");
      throw err;
    }
  };

  const updateSupplierPaymentStatus = async (id: string, status: 'paid', details: { paymentDate: Date; paymentMethod: string }) => {
    if (!can('payments:update')) throw new Error('No tienes permiso para actualizar pagos.');
    try {
      const paymentRef = doc(db, "supplierPayments", id);
      await updateDoc(paymentRef, { 
        status: status,
        paymentDate: Timestamp.fromDate(details.paymentDate),
        paymentMethod: details.paymentMethod,
       });
      notify("El estado del pago ha sido actualizado.", "success");
    } catch (err: any) {
      notify("Error al actualizar el estado del pago: " + err.message, "destructive");
      throw err;
    }
  };

  const updateSupplierPayment = async (id: string, data: Partial<Pick<SupplierPayment, 'work' | 'purchaseOrderNumber'>>) => {
      if (!can('payments:edit')) throw new Error('No tienes permiso para editar facturas.');
      try {
        const paymentRef = doc(db, "supplierPayments", id);
        await updateDoc(paymentRef, data);
        notify("Factura actualizada.", "success");
      } catch (err: any) {
        notify("Error al actualizar la factura: " + err.message, "destructive");
        throw err;
      }
  };

  const addBehaviorObservation = async (observation: Omit<BehaviorObservation, 'id' | 'observerId' | 'observerName' | 'createdAt'>) => {
    if (!can('safety_observations:create')) throw new Error('No tienes permiso para crear observaciones de conducta.');
    if (!authUser) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    try {
      const newDocRef = doc(collection(db, "behaviorObservations"));
      await setDoc(newDocRef, {
        ...observation,
        id: newDocRef.id,
        observerId: authUser.id,
        observerName: authUser.name,
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Observación de conducta guardada.", "success");
    } catch (err: any) {
      notify("Error al guardar la observación: " + err.message, "destructive");
      throw err;
    }
  };

  const batchApprovedRequests = async (requestIds: string[], options: { mode: "category" | "supplier" }) => {
    if (!can('lots:create')) throw new Error('No tienes permiso para crear lotes.');
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
    if (!can('lots:edit')) throw new Error('No tienes permiso para editar lotes.');
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
    if (!can('lots:edit')) throw new Error('No tienes permiso para editar lotes.');
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
    if (!can('lots:create')) throw new Error('No tienes permiso para crear lotes.');
    try {
      const newLotId = `manual-${lotName.replace(/\s/g, "-").toLowerCase()}-${nanoid(4)
        }`;
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
    if (!can('lots:delete')) throw new Error('No tienes permiso para eliminar lotes.');
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
    units,
    requests,
    returnRequests,
    toolLogs,
    attendanceLogs,
    purchaseRequests,
    suppliers,
    supplierPayments,
    purchaseOrders,
    manualLots,
    checklistTemplates,
    assignedChecklists,
    safetyInspections,
    behaviorObservations,
    tenants,
    roles,
    currentTenantId,
    setCurrentTenantId,
    can,
    updateRolePermissions,
    addTenant,
    deleteTenant,
    addTool,
    updateTool,
    deleteTool,
    saveAttendanceLog,
    deleteAttendanceLog,
    updateUser,
    deleteUser,
    addRequest,
    addReturnRequest,
    approveRequest,
    approveReturnRequest,
    checkoutTool,
    returnTool,
    findActiveLogForTool,
    handleAttendanceScan,
    addManualAttendance,
    updateAttendanceLog,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addManualStockEntry,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    addUnit,
    deleteUnit,
    addPurchaseRequest,
    updatePurchaseRequestStatus,
    deletePurchaseRequest,
    receivePurchaseRequest,
    generatePurchaseOrder,
    cancelPurchaseOrder,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addChecklistTemplate,
    deleteChecklistTemplate,
    assignChecklistToSupervisors,
    completeAssignedChecklist,
    reviewAssignedChecklist,
    deleteAssignedChecklist,
    addChecklist,
    addSafetyInspection,
    completeSafetyInspection,
    reviewSafetyInspection,
    addSupplierPayment,
    updateSupplierPaymentStatus,
    updateSupplierPayment,
    addBehaviorObservation,
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
  user: (User & { fb: FirebaseAuthUser, permissions: Permission[] }) | null;
  authLoading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
  reauthenticateAndChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  reauthenticateAndChangeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
} | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<(User & { fb: FirebaseAuthUser, permissions: Permission[] }) | null>(null);
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
            const userData = userDoc.data() as User;
            const rolesRef = collection(db, "roles");
            const rolesSnapshot = await getDocs(rolesRef);
            const rolesData = rolesSnapshot.docs.reduce((acc, doc) => {
              acc[doc.id] = doc.data();
              return acc;
            }, {} as any);
            const permissions = rolesData[userData.role]?.capabilities || [];

            if (userData.id !== firebaseUser.uid) {
                await updateDoc(userDocRef, { id: firebaseUser.uid, qrCode: `USER-${firebaseUser.uid}` });
            }
            setUser({ ...userData, id: firebaseUser.uid, fb: firebaseUser, permissions });
          } else {
             const userQuery = query(collection(db, "users"), where("email", "==", firebaseUser.email));
             const userSnapshot = await getDocs(userQuery);
             if (!userSnapshot.empty) {
                 const invitedUserDoc = userSnapshot.docs[0];
                 const invitedUserRef = doc(db, "users", invitedUserDoc.id);
                 const batch = writeBatch(db);
                 batch.delete(invitedUserRef);
                 
                 const newUserRef = doc(db, "users", firebaseUser.uid);
                 const userData = invitedUserDoc.data();
                 batch.set(newUserRef, { ...userData, id: firebaseUser.uid, qrCode: `USER-${firebaseUser.uid}` });
                 
                 await batch.commit();
                 const rolesRef = collection(db, "roles");
                 const rolesSnapshot = await getDocs(rolesRef);
                 const rolesData = rolesSnapshot.docs.reduce((acc, doc) => {
                   acc[doc.id] = doc.data();
                   return acc;
                 }, {} as any);
                 const permissions = rolesData[userData.role]?.capabilities || [];
                 setUser({ ...(userData as User), id: firebaseUser.uid, fb: firebaseUser, permissions });

             } else {
                setUser(null);
                console.error("No user document found in Firestore for UID:", firebaseUser.uid);
                await signOut(auth);
             }
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error("Auth state change error:", err);
        if (err.code === 'unavailable') {
            toast({
              variant: "destructive",
              title: "Error de Conexión",
              description: "No se pudo conectar a la base de datos. Revisa tu conexión a internet.",
              duration: 10000,
            });
        } else {
            toast({
              variant: "destructive",
              title: "Error de autenticación",
              description: "No se pudo verificar tu sesión. " + err.message,
            });
        }
        setUser(null); // Ensure user is logged out on error
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
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // or a basic loading skeleton
  }

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
