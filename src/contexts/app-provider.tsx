
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
} from "firebase/firestore";
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    type User as FirebaseAuthUser,
    sendPasswordResetEmail
} from "firebase/auth";


// Helper to convert Firestore Timestamps to JS Date objects
const convertTimestamps = (data: any) => {
    const convert = (value: any): any => {
        if (value instanceof Timestamp) {
            return value.toDate();
        }
        if (Array.isArray(value)) {
            return value.map(convert);
        }
        if (value && typeof value === 'object') {
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
  if (!str) return '';
  // This will remove accents and convert to uppercase
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}


// App State Context
interface AppStateContextType {
  users: User[];
  tools: Tool[];
  materials: Material[];
  materialCategories: MaterialCategory[];
  requests: MaterialRequest[];
  toolLogs: ToolLog[];
  purchaseRequests: PurchaseRequest[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  manualLots: string[];
  addTool: (toolName: string) => Promise<void>;
  updateTool: (toolId: string, data: Partial<Omit<Tool, 'id' | 'qrCode'>>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Omit<User, 'id' | 'email' | 'qrCode'>>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRequest: (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  checkoutTool: (toolId: string, workerId: string, supervisorId: string) => Promise<void>;
  returnTool: (logId: string, condition: 'ok' | 'damaged', notes?: string) => Promise<void>;
  addMaterial: (material: Omit<Material, "id">) => Promise<void>;
  updateMaterial: (materialId: string, data: Partial<Omit<Material, "id">>) => Promise<void>;
  addMaterialCategory: (name: string) => Promise<void>;
  updateMaterialCategory: (id: string, name: string) => Promise<void>;
  deleteMaterialCategory: (id: string) => Promise<void>;
  addPurchaseRequest: (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => Promise<void>;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequestStatus, data?: Partial<Pick<PurchaseRequest, 'materialName'|'quantity'|'notes'>>) => Promise<void>;
  receivePurchaseRequest: (purchaseRequestId: string) => Promise<void>;
  generatePurchaseOrder: (requests: PurchaseRequest[], supplierId: string) => Promise<void>;
  cancelPurchaseOrder: (orderId: string) => Promise<void>;
  addSupplier: (name: string, categories: string[]) => Promise<void>;
  updateSupplier: (supplierId: string, data: Partial<Omit<Supplier, 'id'>>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  batchApprovedRequests: (requestIds: string[], options: { mode: 'category' | 'supplier' }) => Promise<void>;
  removeRequestFromLot: (requestId: string) => Promise<void>;
  addRequestToLot: (requestId: string, lotId: string) => Promise<void>;
  createLot: (lotName: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppStateContext = React.createContext<AppStateContextType | null>(null);

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [materialCategories, setMaterialCategories] = React.useState<MaterialCategory[]>([]);
  const [requests, setRequests] = React.useState<MaterialRequest[]>([]);
  const [toolLogs, setToolLogs] = React.useState<ToolLog[]>([]);
  const [purchaseRequests, setPurchaseRequests] = React.useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([]);
  const [manualLots, setManualLots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { user: authUser } = useAuth();


  React.useEffect(() => {
    const setup = async () => {
        setLoading(true);

        const collections: { name: string; setter: React.Dispatch<React.SetStateAction<any[]>>; sortField?: string }[] = [
          { name: "users", setter: setUsers, sortField: "name" },
          { name: "tools", setter: setTools, sortField: "name" },
          { name: "materials", setter: setMaterials, sortField: "name" },
          { name: "materialCategories", setter: setMaterialCategories, sortField: "name" },
          { name: "suppliers", setter: setSuppliers, sortField: "name" },
          { name: "requests", setter: setRequests, sortField: "createdAt" },
          { name: "toolLogs", setter: setToolLogs, sortField: "checkoutDate" },
          { name: "purchaseRequests", setter: setPurchaseRequests, sortField: "createdAt" },
          { name: "purchaseOrders", setter: setPurchaseOrders, sortField: "createdAt" },
        ];

        const unsubscribes = collections.map(({ name, setter, sortField }) => {
          const collRef = collection(db, name);
          const q = sortField ? query(collRef, orderBy(sortField, "desc")) : collRef;
          return onSnapshot(q, 
            (snapshot) => {
              const data = snapshot.docs.map(doc => convertTimestamps({ ...doc.data(), id: doc.id }));
              setter(data);
            }, 
            (err) => {
              console.error(`Error fetching ${name}:`, err);
              setError(`Error al cargar datos de ${name}. Comprueba tu conexión a Firebase y la configuración de seguridad.`);
            }
          );
        });

        // We can consider loading to be false after subscriptions are set up
        setLoading(false);

        return () => unsubscribes.forEach(unsub => unsub());
    };

    const unsubscribe = setup();

    return () => {
        unsubscribe.then(cleanup => cleanup && cleanup()).catch(e => console.error("Error cleaning up listeners", e));
    };
  }, []);

  const addTool = async (toolName: string) => {
    const normalizedToolName = normalizeString(toolName);
    const newDocRef = doc(collection(db, "tools"));
    await setDoc(newDocRef, {
      id: newDocRef.id,
      name: toolName,
      qrCode: `TOOL-${normalizedToolName.toUpperCase().replace(/\s/g, "-")}-${nanoid(4)}`
    });
  };
  
  const updateTool = async (toolId: string, data: Partial<Omit<Tool, 'id' | 'qrCode'>>) => {
      if (!toolId) throw new Error("Tool ID is required");
      const toolRef = doc(db, "tools", toolId);
      await updateDoc(toolRef, data);
  };
  
  const deleteTool = async (toolId: string) => {
      if (!toolId) throw new Error("Tool ID is required");
      const isToolInUse = toolLogs.some(log => log.toolId === toolId && log.returnDate === null);
      if (isToolInUse) {
          throw new Error("No se puede eliminar una herramienta que está actualmente en uso.");
      }
      const toolRef = doc(db, "tools", toolId);
      await deleteDoc(toolRef);
  };

  const updateUser = async (userId: string, data: Partial<Omit<User, 'id' | 'email' | 'qrCode'>>) => {
      if (!userId) throw new Error("User ID is required");
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, data);
  }

  const deleteUser = async (userId: string) => {
      if (!userId) throw new Error("User ID is required");
      
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
  }
  
  const addMaterial = async (material: Omit<Material, "id">) => {
    const batch = writeBatch(db);
    const newMaterialRef = doc(collection(db, "materials"));
    
    batch.set(newMaterialRef, {...material, id: newMaterialRef.id});

    if (material.stock > 0 && authUser) {
        const newPurchaseRequestRef = doc(collection(db, "purchaseRequests"));
        batch.set(newPurchaseRequestRef, {
            id: newPurchaseRequestRef.id,
            materialName: material.name,
            quantity: material.stock,
            unit: material.unit,
            category: material.category,
            justification: 'Ingreso Manual de Stock Inicial',
            area: 'Bodega Central',
            supervisorId: authUser.id,
            status: 'received',
            createdAt: Timestamp.now(),
            receivedAt: Timestamp.now(),
            lotId: null,
        });
    }
    
    await batch.commit();
  }
  
  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, 'id'>>) => {
      const materialRef = doc(db, "materials", materialId);
      await updateDoc(materialRef, {
        ...data,
        supplierId: data.supplierId === "ninguno" ? null : data.supplierId,
      });
  }

  const addMaterialCategory = async (name: string) => {
    const newDocRef = doc(collection(db, 'materialCategories'));
    await setDoc(newDocRef, { name, id: newDocRef.id });
  };

  const updateMaterialCategory = async (id: string, name: string) => {
    const categoryRef = doc(db, 'materialCategories', id);
    await updateDoc(categoryRef, { name });
  };

  const deleteMaterialCategory = async (id: string) => {
    const categoryRef = doc(db, 'materialCategories', id);
    const categoryDoc = await getDoc(categoryRef);
    const category = categoryDoc.data() as MaterialCategory;

    const materialsWithCategory = await getDocs(
      query(collection(db, 'materials'), where('category', '==', category.name))
    );
    if (!materialsWithCategory.empty) {
      throw new Error(
        'No se puede eliminar: existen materiales asignados a esta categoría.'
      );
    }
    
    const suppliersWithCategory = await getDocs(
      query(collection(db, 'suppliers'), where('categories', 'array-contains', category.name))
    );
    if (!suppliersWithCategory.empty) {
      throw new Error(
        'No se puede eliminar: existen proveedores asignados a esta categoría.'
      );
    }

    await deleteDoc(categoryRef);
  };


  const addRequest = async (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => {
    const newDocRef = doc(collection(db, "requests"));
    await setDoc(newDocRef, {
      ...request,
      id: newDocRef.id,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
  };
  
  const approveRequest = async (requestId: string) => {
    const requestRef = doc(db, "requests", requestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) throw new Error("Solicitud no encontrada");
    const request = requestDoc.data() as Omit<MaterialRequest, "id">;

    const materialRef = doc(db, "materials", request.materialId);
    const materialDoc = await getDoc(materialRef);
    if (!materialDoc.exists()) throw new Error("Material no encontrado");
    const material = materialDoc.data() as Omit<Material, "id">;
    
    if(material.stock < request.quantity) throw new Error("Stock insuficiente");

    const batch = writeBatch(db);
    batch.update(materialRef, { stock: material.stock - request.quantity });
    batch.update(requestRef, { status: 'approved' });
    await batch.commit();
  };

  const checkoutTool = async (toolId: string, workerId: string, supervisorId: string) => {
     const newDocRef = doc(collection(db, "toolLogs"));
     await setDoc(newDocRef, {
        id: newDocRef.id,
        toolId,
        workerId,
        supervisorId,
        checkoutDate: Timestamp.now(),
        returnDate: null,
    });
  };

  const returnTool = async (logId: string, condition: 'ok' | 'damaged' = 'ok', notes: string = '') => {
    const logRef = doc(db, "toolLogs", logId);
    await updateDoc(logRef, { 
        returnDate: Timestamp.now(),
        returnCondition: condition,
        returnNotes: notes,
     });
  };
  
  const addPurchaseRequest = async (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => {
    const newDocRef = doc(collection(db, "purchaseRequests"));
    await setDoc(newDocRef, {
      ...request,
      id: newDocRef.id,
      status: 'pending',
      createdAt: Timestamp.now(),
      receivedAt: null,
      lotId: null,
    });
  };

  const updatePurchaseRequestStatus = async (id: string, status: PurchaseRequestStatus, data?: Partial<Pick<PurchaseRequest, 'materialName'|'quantity'|'notes'>>) => {
    if (!authUser) throw new Error("Acción no autorizada.");
    const requestRef = doc(db, "purchaseRequests", id);
    
    let updateData: any = { 
        status,
        approvedById: authUser.id,
        approvedAt: Timestamp.now(),
    };

    if (data) {
        const originalRequest = purchaseRequests.find(pr => pr.id === id);
        if (originalRequest) {
            updateData = { 
                ...updateData, 
                ...data,
                originalQuantity: originalRequest.quantity, // Save original quantity
            };
        }
    }
    
    await updateDoc(requestRef, updateData);
  };

  const receivePurchaseRequest = async (purchaseRequestId: string) => {
    const reqRef = doc(db, "purchaseRequests", purchaseRequestId);
    const reqDoc = await getDoc(reqRef);
    if (!reqDoc.exists()) throw new Error("Solicitud de compra no encontrada");
    const req = reqDoc.data() as PurchaseRequest;

    if (req.status !== 'ordered') throw new Error("La solicitud no está en estado 'Ordenada' y no puede ser recibida.");
    
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

    batch.update(reqRef, { status: 'received', receivedAt: Timestamp.now() });
    await batch.commit();
  };

  const generatePurchaseOrder = async (requests: PurchaseRequest[], supplierId: string) => {
      const itemMap = new Map<string, { totalQuantity: number; unit: string; category: string }>();

      for (const req of requests) {
          const key = `${req.materialName}__${req.unit}`;
          if (itemMap.has(key)) {
              const existing = itemMap.get(key)!;
              existing.totalQuantity += req.quantity;
          } else {
              itemMap.set(key, { totalQuantity: req.quantity, unit: req.unit, category: req.category });
          }
      }

      const batch = writeBatch(db);
      
      const newOrderRef = doc(collection(db, "purchaseOrders"));
      batch.set(newOrderRef, {
          id: newOrderRef.id,
          supplierId,
          createdAt: Timestamp.now(),
          status: 'generated',
          requestIds: requests.map(req => req.id),
          items: Array.from(itemMap.entries()).map(([key, { totalQuantity, unit, category }]) => ({
              materialName: key.split('__')[0],
              totalQuantity,
              unit,
              category,
          }))
      });

      // NO CAMBIAMOS EL ESTADO DE LAS SOLICITUDES PARA PERMITIR MÚLTIPLES COTIZACIONES
      // for (const req of requests) {
      //   const reqRef = doc(db, "purchaseRequests", req.id);
      //   batch.update(reqRef, { status: 'ordered' });
      // }
      
      await batch.commit();
  }

  const cancelPurchaseOrder = async (orderId: string) => {
    const orderRef = doc(db, 'purchaseOrders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('La orden de compra no existe.');
    }
    
    // Solo borramos la orden, no revertimos el estado para permitir múltiples cotizaciones.
    // La lógica de "qué se ha pedido" reside ahora en la página de recepción.
    await deleteDoc(orderRef);
  };
  
  const addSupplier = async (name: string, categories: string[]) => {
      const newDocRef = doc(collection(db, "suppliers"));
      await setDoc(newDocRef, { id: newDocRef.id, name, categories });
  };
  
  const updateSupplier = async (supplierId: string, data: Partial<Omit<Supplier, 'id'>>) => {
      if (!supplierId) throw new Error("Supplier ID is required");
      const supplierRef = doc(db, "suppliers", supplierId);
      await updateDoc(supplierRef, data);
  };
  
  const deleteSupplier = async (supplierId: string) => {
      if (!supplierId) throw new Error("Supplier ID is required");
      const isSupplierInUse = materials.some(m => m.supplierId === supplierId);
      if (isSupplierInUse) {
          throw new Error("No se puede eliminar. El proveedor está asignado a uno o más materiales.");
      }
      const supplierRef = doc(db, "suppliers", supplierId);
      await deleteDoc(supplierRef);
  };

  const batchApprovedRequests = async (requestIds: string[], options: { mode: 'category' | 'supplier' }) => {
    const batch = writeBatch(db);
    const relevantRequests = purchaseRequests.filter(pr => requestIds.includes(pr.id));

    if (options.mode === 'category') {
        const groups = new Map<string, string>(); // category -> lotId
        for (const req of relevantRequests) {
            const lotCategory = `lot-${req.category.replace(/\s/g, "-")}`;
            if (!groups.has(lotCategory)) {
                groups.set(lotCategory, `${lotCategory}-${nanoid(4)}`);
            }
            const lotId = groups.get(lotCategory)!;
            const reqRef = doc(db, "purchaseRequests", req.id);
            batch.update(reqRef, { lotId, status: 'batched' });
        }
    } else if (options.mode === 'supplier') {
        const materialNames = [...new Set(relevantRequests.map(r => r.materialName))];
        const materialToSupplierMap = new Map<string, string | null>();
        if (materialNames.length > 0) {
            const materialDocs = await getDocs(query(collection(db, "materials"), where('name', 'in', materialNames)));
            materialDocs.docs.forEach(doc => {
                const mat = doc.data() as Material;
                materialToSupplierMap.set(mat.name, mat.supplierId || null);
            });
        }

        for (const req of relevantRequests) {
            const supplierId = materialToSupplierMap.get(req.materialName);
            if (!supplierId) continue; 
            
            const lotId = supplierId;
            const reqRef = doc(db, "purchaseRequests", req.id);
            batch.update(reqRef, { lotId, status: 'batched' });
        }
    }

    await batch.commit();
  };
  
  const removeRequestFromLot = async (requestId: string) => {
    const requestRef = doc(db, "purchaseRequests", requestId);
    await updateDoc(requestRef, { lotId: null, status: 'approved' });
  };
  
  const addRequestToLot = async (requestId: string, lotId: string) => {
    const requestRef = doc(db, "purchaseRequests", requestId);
    await updateDoc(requestRef, { lotId, status: 'batched' });
  };

  const createLot = async (lotName: string) => {
    const newLotId = `manual-${lotName.replace(/\s/g, "-").toLowerCase()}-${nanoid(4)}`;
    if (manualLots.includes(newLotId) || purchaseRequests.some(pr => pr.lotId === newLotId)) {
      throw new Error('Ya existe un lote con este nombre.');
    }
    setManualLots(prev => [...prev, newLotId]);
  };


  const contextValue = {
    users,
    tools,
    materials,
    materialCategories,
    requests,
    toolLogs,
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
    addMaterial,
    updateMaterial,
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
    loading,
    error,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => {
    const context = React.useContext(AppStateContext);
    if (!context) {
        throw new Error("useAppState must be used within an AppStateProvider");
    }
    return context;
};

// Auth Context
interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  authLoading: boolean;
  error: string | null;
}
const AuthContext = React.createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseAuthUser | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const initialCheckComplete = React.useRef(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUserData) => {
        if (authUserData) {
            setFirebaseUser(authUserData);
            const userDocRef = doc(db, "users", authUserData.uid);
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser(userDoc.data() as User);
                } else {
                    setUser(null);
                    setError("El usuario no existe en la base de datos.");
                    await signOut(auth);
                }
            } catch (e) {
                console.error("Error fetching user document", e);
                setUser(null);
                setError("Error al obtener datos del usuario.");
            }
        } else {
            setFirebaseUser(null);
            setUser(null);
        }
        setAuthLoading(false);
        initialCheckComplete.current = true;
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const authContextValue = {
    user,
    firebaseUser,
    login,
    logout,
    sendPasswordReset,
    authLoading,
    error,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Main Providers
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
        <AppStateProvider>{children}</AppStateProvider>
      </AuthProvider>
  );
}
