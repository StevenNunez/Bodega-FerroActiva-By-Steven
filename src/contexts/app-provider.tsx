
"use client";

import * as React from "react";
import {
  User,
  UserRole,
  Tool,
  Material,
  MaterialRequest,
  ToolLog,
  PurchaseRequest,
  PurchaseRequestStatus,
  Supplier,
  PurchaseOrder,
  MATERIAL_CATEGORIES,
} from "@/lib/data";
import { nanoid } from "nanoid";
import { db } from "@/lib/firebase";
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
    deleteDoc,
    getDocs,
    setDoc
} from "firebase/firestore";

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


// App State Context
interface AppStateContextType {
  users: User[];
  tools: Tool[];
  materials: Material[];
  requests: MaterialRequest[];
  toolLogs: ToolLog[];
  purchaseRequests: PurchaseRequest[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addTool: (toolName: string) => Promise<void>;
  addUser: (name: string, role: UserRole) => Promise<void>;
  addRequest: (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  checkoutTool: (toolId: string, workerId: string, supervisorId: string) => Promise<void>;
  returnTool: (logId: string) => Promise<void>;
  addMaterial: (material: Omit<Material, "id">) => Promise<void>;
  updateMaterial: (materialId: string, data: Partial<Omit<Material, "id">>) => Promise<void>;
  addPurchaseRequest: (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => Promise<void>;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequestStatus) => Promise<void>;
  receivePurchaseRequest: (purchaseRequestId: string) => Promise<void>;
  generatePurchaseOrder: (requests: PurchaseRequest[], supplierId: string) => Promise<void>;
  addSupplier: (name: string, categories: string[]) => Promise<void>;
  batchApprovedRequests: (requestIds: string[]) => Promise<void>;
  removeRequestFromLot: (requestId: string) => Promise<void>;
  addRequestToLot: (requestId: string, lotId: string) => Promise<void>;
  seedInitialData: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppStateContext = React.createContext<AppStateContextType | null>(null);

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [requests, setRequests] = React.useState<MaterialRequest[]>([]);
  const [toolLogs, setToolLogs] = React.useState<ToolLog[]>([]);
  const [purchaseRequests, setPurchaseRequests] = React.useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const collections: { name: string; setter: React.Dispatch<React.SetStateAction<any[]>>; sortField?: string }[] = [
      { name: "users", setter: setUsers, sortField: "name" },
      { name: "tools", setter: setTools, sortField: "name" },
      { name: "materials", setter: setMaterials, sortField: "name" },
      { name: "suppliers", setter: setSuppliers, sortField: "name" },
      { name: "requests", setter: setRequests, sortField: "createdAt" },
      { name: "toolLogs", setter: setToolLogs, sortField: "checkoutDate" },
      { name: "purchaseRequests", setter: setPurchaseRequests, sortField: "createdAt" },
      { name: "purchaseOrders", setter: setPurchaseOrders, sortField: "createdAt" },
    ];

    setLoading(true);
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
    
    // Check if all initial fetches are done
    const allLoaded = Promise.all(
        collections.map(({ name }) => getDocs(query(collection(db, name))))
    );

    allLoaded.then(() => {
        setLoading(false);
    }).catch(err => {
        console.error("Error during initial data load:", err);
        setError("Error al cargar los datos iniciales. Verifica la conexión.");
        setLoading(false);
    });


    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const seedInitialData = async () => {
    const batch = writeBatch(db);

    // Initial Users
    const initialUsers = [
        { name: "Admin Bodega", role: "admin" },
        { name: "Jefe de Operaciones", role: "operations" },
        { name: "Juan Perez (Supervisor)", role: "supervisor" },
        { name: "Diego Palma (Colaborador)", role: "worker" },
    ];
    initialUsers.forEach(user => {
        const userRef = doc(collection(db, "users"));
        batch.set(userRef, { 
            ...user, 
            qrCode: user.role === 'admin' || user.role === 'operations' ? null : `USER-${user.name.toUpperCase().replace(/\s/g, "-")}-${nanoid(4)}`
        });
    });

    // Initial Materials
    const initialMaterials: Omit<Material, 'id'>[] = [
      { name: 'Cemento Portland', stock: 200, unit: 'saco', category: 'Hormigón y Cemento', supplierId: null },
      { name: 'Arena Fina', stock: 150, unit: 'saco', category: 'Hormigón y Cemento', supplierId: null },
      { name: 'Grava', stock: 150, unit: 'saco', category: 'Hormigón y Cemento', supplierId: null },
      { name: 'Ladrillo Fiscal', stock: 5000, unit: 'un', category: 'Misceláneos', supplierId: null },
      { name: 'Fierro Estriado 8mm', stock: 80, unit: 'un', category: 'Fierros y Acero', supplierId: null },
    ];
    initialMaterials.forEach(material => {
        const materialRef = doc(collection(db, "materials"));
        batch.set(materialRef, material);
    });

    // Initial Tools
    const initialTools = [
        { name: "Taladro Percutor Bosch" },
        { name: "Esmeril Angular DeWalt" },
        { name: "Martillo Carpintero" }
    ];
    initialTools.forEach(tool => {
        const toolRef = doc(collection(db, "tools"));
        batch.set(toolRef, { 
            name: tool.name, 
            qrCode: `TOOL-${tool.name.toUpperCase().replace(/\s/g, "-")}-${nanoid(4)}`
        });
    });

    // Initial Supplier
    const supplierRef = doc(collection(db, "suppliers"));
    batch.set(supplierRef, {
        name: "Ferretería El Martillo",
        categories: [MATERIAL_CATEGORIES[0], MATERIAL_CATEGORIES[4], MATERIAL_CATEGORIES[7]]
    });
    
    await batch.commit();
  }


  const addTool = async (toolName: string) => {
    await addDoc(collection(db, "tools"), {
      name: toolName,
      qrCode: `TOOL-${toolName.toUpperCase().replace(/\s/g, "-")}-${nanoid(4)}`
    });
  };
  
  const addUser = async (name: string, role: UserRole) => {
     await addDoc(collection(db, "users"), {
        name,
        role,
        qrCode: role === 'admin' || role === 'operations' ? null : `USER-${name.toUpperCase().replace(/\s/g, "-")}-${nanoid(4)}`
    });
  }
  
  const addMaterial = async (material: Omit<Material, "id">) => {
    await addDoc(collection(db, "materials"), material);
  }
  
  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, 'id'>>) => {
      const materialRef = doc(db, "materials", materialId);
      await updateDoc(materialRef, data);
  }


  const addRequest = async (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => {
    await addDoc(collection(db, "requests"), {
      ...request,
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
     await addDoc(collection(db, "toolLogs"), {
        toolId,
        workerId,
        supervisorId,
        checkoutDate: Timestamp.now(),
        returnDate: null,
    });
  };

  const returnTool = async (logId: string) => {
    const logRef = doc(db, "toolLogs", logId);
    await updateDoc(logRef, { returnDate: Timestamp.now() });
  };
  
  const addPurchaseRequest = async (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => {
    await addDoc(collection(db, "purchaseRequests"), {
      ...request,
      status: 'pending',
      createdAt: Timestamp.now(),
      receivedAt: null,
      lotId: null,
    });
  };

  const updatePurchaseRequestStatus = async (id: string, status: PurchaseRequestStatus) => {
    const requestRef = doc(db, "purchaseRequests", id);
    await updateDoc(requestRef, { status });
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
        // Material no existe, crearlo
        const newMaterialRef = doc(collection(db, "materials"));
        batch.set(newMaterialRef, { 
            name: req.materialName, 
            stock: req.quantity,
            unit: req.unit,
            category: req.category,
            supplierId: null,
        });
    } else {
        // Material existe, actualizar stock
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
          id: newOrderRef.id, // Store doc id for consistency
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
      
      for (const req of requests) {
          const reqRef = doc(db, "purchaseRequests", req.id);
          batch.update(reqRef, { status: 'ordered', lotId: null });
      }

      await batch.commit();
  }
  
  const addSupplier = async (name: string, categories: string[]) => {
      await addDoc(collection(db, "suppliers"), { name, categories });
  };

  const batchApprovedRequests = async (requestIds: string[]) => {
      const batch = writeBatch(db);
      const categoriesToBatch = new Map<string, string>();
      
      // Pre-calculate lotIds for each category to ensure consistency
      for (const id of requestIds) {
          const req = purchaseRequests.find(pr => pr.id === id);
          if (req && req.status === 'approved' && !req.lotId && !categoriesToBatch.has(req.category)) {
              categoriesToBatch.set(req.category, `lot-${nanoid(6)}`);
          }
      }

      for (const id of requestIds) {
          const req = purchaseRequests.find(pr => pr.id === id);
          if (req && req.status === 'approved' && !req.lotId) {
              const lotId = categoriesToBatch.get(req.category);
              if (lotId) {
                  const reqRef = doc(db, "purchaseRequests", id);
                  batch.update(reqRef, { lotId: lotId });
              }
          }
      }
      
      await batch.commit();
  };
  
  const removeRequestFromLot = async (requestId: string) => {
    const requestRef = doc(db, "purchaseRequests", requestId);
    await updateDoc(requestRef, { lotId: null });
  };
  
  const addRequestToLot = async (requestId: string, lotId: string) => {
    const requestRef = doc(db, "purchaseRequests", requestId);
    await updateDoc(requestRef, { lotId });
  };


  const contextValue = {
    users,
    tools,
    materials,
    requests,
    toolLogs,
    purchaseRequests,
    suppliers,
    purchaseOrders,
    addTool,
    addUser,
    addRequest,
    approveRequest,
    checkoutTool,
    returnTool,
    addMaterial,
    updateMaterial,
    addPurchaseRequest,
    updatePurchaseRequestStatus,
    receivePurchaseRequest,
    generatePurchaseOrder,
    addSupplier,
    batchApprovedRequests,
    removeRequestFromLot,
    addRequestToLot,
    seedInitialData,
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
  login: (userId: string) => Promise<void>;
  logout: () => void;
  authLoading: boolean;
}
const AuthContext = React.createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const { users, loading: appLoading } = useAppState();

  React.useEffect(() => {
    if (!appLoading) {
      try {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            const foundUser = users.find(u => u.id === storedUserId);
            setUser(foundUser || null);
        }
      } catch (e) {
        console.error("Could not parse user from localStorage", e);
        localStorage.removeItem('userId');
      } finally {
         setAuthLoading(false);
      }
    }
  }, [appLoading, users]);

  const login = async (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if(foundUser){
      setUser(foundUser);
      localStorage.setItem('userId', userId);
    } else {
      console.error("Login failed: User not found");
      setUser(null);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };
  
  const authContextValue = {
    user,
    login,
    logout,
    authLoading,
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
      <AppStateProvider>
        <AuthProvider>{children}</AuthProvider>
      </AppStateProvider>
  );
}
