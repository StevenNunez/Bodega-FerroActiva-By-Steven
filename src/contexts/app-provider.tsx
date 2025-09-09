
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
    collectionGroup
} from "firebase/firestore";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    type User as FirebaseAuthUser,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
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
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


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
  updateTool: (toolId: string, data: Partial<Omit<Tool, 'id' | 'qrCode'>>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Omit<User, 'id' | 'email' | 'qrCode'>>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRequest: (request: Omit<MaterialRequest, "id" | "status" | "createdAt">) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  checkoutTool: (toolId: string, workerId: string, supervisorId: string) => Promise<void>;
  returnTool: (logId: string, condition: 'ok' | 'damaged', notes?: string) => Promise<void>;
  addMaterial: (material: Omit<Material, "id" | "supplierId"> & { supplierId?: string | null }) => Promise<void>;
  updateMaterial: (materialId: string, data: Partial<Omit<Material, "id">>) => Promise<void>;
  addPurchaseRequest: (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId">) => Promise<void>;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequestStatus) => Promise<void>;
  receivePurchaseRequest: (purchaseRequestId: string) => Promise<void>;
  generatePurchaseOrder: (requests: PurchaseRequest[], supplierId: string) => Promise<void>;
  addSupplier: (name: string, categories: string[]) => Promise<void>;
  batchApprovedRequests: (requestIds: string[]) => Promise<void>;
  removeRequestFromLot: (requestId: string) => Promise<void>;
  addRequestToLot: (requestId: string, lotId: string) => Promise<void>;
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
    const setup = async () => {
        setLoading(true);

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
    await addDoc(collection(db, "tools"), {
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
      
      // IMPORTANT: Deleting a user from Firebase Auth from the client-side is a privileged
      // operation and is NOT possible. This would require a Cloud Function.
      // For this prototype, we will only delete the user from the Firestore collection.
      // The user will still be able to log in but won't have a profile in the app.
      // In a real app, a Cloud Function would be triggered to delete the Auth user.
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
  }
  
  const addMaterial = async (material: Omit<Material, "id" | "supplierId"> & { supplierId?: string | null }) => {
    await addDoc(collection(db, "materials"), material);
  }
  
  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, 'id'>>) => {
      const materialRef = doc(db, "materials", materialId);
      await updateDoc(materialRef, {
        ...data,
        supplierId: data.supplierId === "ninguno" ? null : data.supplierId,
      });
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

  const returnTool = async (logId: string, condition: 'ok' | 'damaged' = 'ok', notes: string = '') => {
    const logRef = doc(db, "toolLogs", logId);
    await updateDoc(logRef, { 
        returnDate: Timestamp.now(),
        returnCondition: condition,
        returnNotes: notes,
     });
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
        const newMaterialRef = doc(collection(db, "materials"));
        batch.set(newMaterialRef, { 
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
    addPurchaseRequest,
    updatePurchaseRequestStatus,
    receivePurchaseRequest,
    generatePurchaseOrder,
    addSupplier,
    batchApprovedRequests,
    removeRequestFromLot,
    addRequestToLot,
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
  reauthenticateAndChangePassword: (currentPass: string, newPass: string) => Promise<void>;
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
  
  const reauthenticateAndChangePassword = async (currentPass: string, newPass: string) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email) throw new Error("Usuario no autenticado.");

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPass);
      
      // Re-authenticate the user
      await reauthenticateWithCredential(firebaseUser, credential);

      // If re-authentication is successful, update the password
      await updatePassword(firebaseUser, newPass);
  }

  const authContextValue = {
    user,
    firebaseUser,
    login,
    logout,
    reauthenticateAndChangePassword,
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
      <AppStateProvider>
        <AuthProvider>{children}</AuthProvider>
      </AppStateProvider>
  );
}
