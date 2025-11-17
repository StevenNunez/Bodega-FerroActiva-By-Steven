'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useReducer,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  onSnapshot,
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type Query,
  setDoc,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseAuthUser,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail,
} from 'firebase/auth';
import { db, auth, storage } from '@/modules/core/lib/firebase';
import { useToast } from '@/modules/core/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { format } from "date-fns";


import type {
  User,
  UserRole,
  Tenant,
  Material,
  Tool,
  ToolLog,
  MaterialRequest,
  ReturnRequest,
  PurchaseRequest,
  PurchaseRequestStatus,
  Supplier,
  MaterialCategory,
  Unit,
  StockMovement,
  PurchaseLot,
  PurchaseOrder,
  SupplierPayment,
  AttendanceLog,
  AssignedSafetyTask,
  ChecklistTemplate,
  BehaviorObservation,
  SubscriptionPlan,
  SafetyInspection,
  Checklist
} from '@/modules/core/lib/data';
import {
  ROLES as ROLES_DEFAULT,
  Permission,
  PLANS,
} from '@/modules/core/lib/permissions';

// --- Helper Functions ---
const convertTimestamps = (data: any): any => {
  if (data instanceof Timestamp) return data.toDate();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (data && typeof data === 'object' && !React.isValidElement(data)) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = convertTimestamps(data[key]);
      return acc;
    }, {} as { [key: string]: any });
  }
  return data;
};

// This function ensures the default tenant exists.
const ensureDefaultTenantExists = async () => {
  const tenantId = 'ferroactiva';
  const tenantRef = doc(db, 'tenants', tenantId);
  const tenantSnap = await getDoc(tenantRef);

  if (!tenantSnap.exists()) {
    console.log("Default tenant 'ferroactiva' not found, creating it...");
    try {
      await setDoc(tenantRef, {
        name: 'FerroActiva',
        tenantId: tenantId,
        createdAt: serverTimestamp(),
      });
      console.log("Default tenant 'ferroactiva' created successfully.");
    } catch (error) {
      console.error('Error creating default tenant:', error);
    }
  }
};

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  tenants: Tenant[];
  currentTenantId: string | null;
  subscription: SubscriptionPlan | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  reauthenticateAndChangeEmail: (
    currentPass: string,
    newEmail: string
  ) => Promise<void>;
  reauthenticateAndChangePassword: (
    currentPass: string,
    newPass: string
  ) => Promise<void>;
  can: (permission: Permission) => boolean;
  setCurrentTenantId: (tenantId: string | null) => void;
  getTenantId: () => string | null;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionPlan | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    ensureDefaultTenantExists();
  }, []);
  
  // This 'can' is a fallback and will be superseded by the one in AppStateProvider
  const can = useCallback((permission: Permission): boolean => {
    console.warn("`can` function was called from AuthContext directly. This is a fallback and should be overridden by AppStateProvider's context.");
    if (!user) return false;
    if (user.role === 'super-admin') return true;
    const userPermissions = ROLES_DEFAULT[user.role]?.permissions;
    return !!userPermissions?.includes(permission);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setUser(userData);
          // Set tenant based on role
          if (userData.role !== 'super-admin') {
            setCurrentTenantId(userData.tenantId);
          }
        } else {
          await signOut(auth);
          setUser(null);
          setCurrentTenantId(null);
        }
      } else {
        setUser(null);
        setCurrentTenantId(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.role === 'super-admin') {
      const q = query(collection(db, 'tenants'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setTenants(
            snapshot.docs.map(
              (doc) =>
                convertTimestamps({ ...doc.data(), id: doc.id }) as Tenant
            )
          );
        },
        (error) => {
          console.error('Error fetching tenants:', error);
        }
      );
      return () => unsubscribe();
    } else {
      setTenants([]);
    }
  }, [user]);

  useEffect(() => {
    const tenantToUse =
      user?.role === 'super-admin' ? currentTenantId : user?.tenantId;
    if (tenantToUse) {
      const subRef = doc(db, 'subscriptions', tenantToUse);
      const unsubscribe = onSnapshot(subRef, (snap) => {
        setSubscription(
          snap.exists()
            ? (snap.data() as SubscriptionPlan)
            : (PLANS.professional as SubscriptionPlan) // Fallback to pro
        );
      });
      return () => unsubscribe();
    } else {
      setSubscription(null);
    }
  }, [currentTenantId, user]);

  const getTenantId = useCallback(() => {
    if (!user) return null;
    return user.role === 'super-admin' ? currentTenantId : user.tenantId;
  }, [user, currentTenantId]);


  const login = (email: string, pass: string) =>
    signInWithEmailAndPassword(auth, email, pass);
  const logout = () =>
    signOut(auth).then(() => {
      setUser(null);
      setCurrentTenantId(null);
      window.location.href = '/login';
    });
  const sendPasswordReset = (email: string) =>
    sendPasswordResetEmail(auth, email);

  const reauthenticateAndChangeEmail = async (
    currentPass: string,
    newEmail: string
  ) => {
    if (!auth.currentUser?.email)
      throw new Error('No user signed in or email is missing.');
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPass
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updateEmail(auth.currentUser, newEmail);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      email: newEmail,
    });
  };

  const reauthenticateAndChangePassword = async (
    currentPass: string,
    newPass: string
  ) => {
    if (!auth.currentUser?.email)
      throw new Error('No user signed in or email is missing.');
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPass
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
  };

  const value = {
    user,
    authLoading,
    tenants,
    currentTenantId,
    setCurrentTenantId,
    subscription,
    login,
    logout,
    sendPasswordReset,
    can,
    getTenantId,
    reauthenticateAndChangeEmail,
    reauthenticateAndChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- App State Context ---
interface AppDataState {
  [key: string]: any;
}

const initialState: AppDataState = {};

type AppStateAction =
  | {
      type: 'SET_DATA';
      payload: { collection: keyof AppDataState; data: any[] };
    }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ROLES'; payload: typeof ROLES_DEFAULT };

const appReducer = (
  state: AppDataState,
  action: AppStateAction
): AppDataState => {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, [action.payload.collection]: action.payload.data };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ROLES':
      return { ...state, roles: action.payload };
    default:
      return state;
  }
};

interface AppStateContextType extends AppDataState {
  manualLots: string[];
  isLoading: boolean;
  roles: typeof ROLES_DEFAULT;
  can: (permission: Permission) => boolean;
  updateRolePermissions: (
    role: keyof typeof ROLES_DEFAULT,
    permission: string,
    checked: boolean
  ) => Promise<void>;
  addTenant: (data: {
    tenantName: string;
    tenantId: string;
    adminName: string;
    adminEmail: string;
  }) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addMaterial: (
    material: Omit<Material, 'id' | 'tenantId' | 'category'> & {
      categoryId: string;
      justification?: string;
    }
  ) => Promise<void>;
  updateMaterial: (
    id: string,
    data: Partial<Omit<Material, 'id' | 'category'> & { categoryId?: string }>
  ) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addManualStockEntry: (
    materialId: string,
    quantity: number,
    justification: string
  ) => Promise<void>;
  addMaterialCategory: (name: string) => Promise<void>;
  updateMaterialCategory: (id: string, name: string) => Promise<void>;
  deleteMaterialCategory: (id: string) => Promise<void>;
  addUnit: (name: string) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  addTool: (name: string) => Promise<void>;
  updateTool: (id: string, data: Partial<Tool>) => Promise<void>;
  deleteTool: (toolId: string) => Promise<void>;
  checkoutTool: (
    toolId: string,
    userId: string,
    supervisorId: string
  ) => Promise<void>;
  returnTool: (
    logId: string,
    returnStatus: 'ok' | 'damaged',
    notes?: string
  ) => Promise<void>;
  findActiveLogForTool: (toolId: string) => Promise<ToolLog | null>;
  addMaterialRequest: (requestData: {
    items: { materialId: string; quantity: number }[];
    area: string;
    supervisorId: string;
  }) => Promise<void>;
  updateMaterialRequestStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
  addReturnRequest: (
    items: {
      materialId: string;
      materialName: string;
      quantity: number;
      unit: string;
    }[],
    notes: string
  ) => Promise<void>;
  updateReturnRequestStatus: (
    requestId: string,
    status: 'completed' | 'rejected'
  ) => Promise<void>;
  addPurchaseRequest: (
    data: Omit<PurchaseRequest, 'id' | 'status' | 'createdAt' | 'receivedAt' | 'lotId' | 'tenantId'>
  ) => Promise<void>;
  updatePurchaseRequestStatus: (
    requestId: string,
    status: PurchaseRequestStatus,
    data: Partial<PurchaseRequest>
  ) => Promise<void>;
  deletePurchaseRequest: (id: string) => Promise<void>;
  receivePurchaseRequest: (
    requestId: string,
    receivedQuantity: number,
    existingMaterialId?: string
  ) => Promise<void>;
  generatePurchaseOrder: (
    requests: PurchaseRequest[],
    supplierId: string
  ) => Promise<string>;
  cancelPurchaseOrder: (orderId: string) => Promise<void>;
  addSupplier: (data: Omit<Supplier, 'id' | 'tenantId'>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  createLot: (name: string) => Promise<void>;
  addRequestToLot: (requestId: string, lotId: string) => Promise<void>;
  removeRequestFromLot: (requestId: string) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addSupplierPayment: (
    data: Omit<
      SupplierPayment,
      'id' | 'status' | 'tenantId' | 'createdAt' | 'issueDate' | 'dueDate'
    > & { issueDate: Date; dueDate: Date }
  ) => Promise<void>;
  updateSupplierPayment: (
    id: string,
    data: Partial<SupplierPayment>
  ) => Promise<void>;
  markPaymentAsPaid: (
    id: string,
    details: { paymentDate: Date; paymentMethod: string }
  ) => Promise<void>;
  deleteSupplierPayment: (id: string) => Promise<void>;
  addChecklistTemplate: (template: {
    title: string;
    items: { element: string }[];
  }) => Promise<void>;
  deleteChecklistTemplate: (templateId: string) => Promise<void>;
  assignChecklistToSupervisors: (
    template: ChecklistTemplate,
    supervisorIds: string[],
    work: string
  ) => Promise<void>;
  completeAssignedChecklist: (data: AssignedSafetyTask) => Promise<void>;
  reviewAssignedChecklist: (
    checklistId: string,
    status: 'approved' | 'rejected',
    notes: string,
    signature: string
  ) => Promise<void>;
  deleteAssignedChecklist: (id: string) => Promise<void>;
  addChecklist: (checklist: Omit<Checklist, "id" | "createdBy">) => Promise<void>;
  addSafetyInspection: (data: Omit<SafetyInspection, "id" | "status" | "createdAt" | "createdBy" | "tenantId">) => Promise<void>;
  completeSafetyInspection: (id: string, data: Pick<SafetyInspection, 'completionNotes' | 'completionSignature' | 'completionExecutor' | 'completionPhotos'>) => Promise<void>;
  reviewSafetyInspection: (
    inspectionId: string,
    status: 'approved' | 'rejected',
    notes: string,
    signature: string
  ) => Promise<void>;
  addBehaviorObservation: (data: Omit<BehaviorObservation, 'id' | 'observerId' | 'observerName' | 'createdAt' | 'tenantId'>) => Promise<void>;
  addManualAttendance: (
    userId: string,
    date: Date,
    time: string,
    type: 'in' | 'out'
  ) => Promise<void>;
  handleAttendanceScan: (qrCode: string) => Promise<void>;
  updateAttendanceLog: (
    logId: string,
    newTimestamp: Date,
    newType: 'in' | 'out',
    originalTimestamp: Date
  ) => Promise<void>;
  deleteAttendanceLog: (logId: string) => Promise<void>;
  notify: (message: string, variant?: "default" | "destructive" | "success") => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
);

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const authContext = useContext(AuthContext);
  if (!authContext) throw new Error("AppStateProvider must be used within an AuthProvider");
  
  const { user, getTenantId, authLoading } = authContext;
  
  const [dataState, dispatch] = useReducer(appReducer, {
    ...initialState,
    isLoading: true,
    roles: ROLES_DEFAULT,
  });
  const [manualLots, setManualLots] = useState<string[]>([]);
  const { toast } = useToast();
  const notify = useCallback((message: string, variant: "default" | "destructive" | "success" = "default") => {
    toast({
      variant: variant === "success" ? "default" : variant,
      title: variant === "success" ? "Éxito" : variant === "destructive" ? "Error" : "Notificación",
      description: message,
      className: variant === 'success' ? 'border-green-500' : ''
    });
  }, [toast]);
  
  const can = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === 'super-admin') return true;
      // Use the dynamic roles from the state, not the default ones.
      const userPermissions = dataState.roles[user.role]?.permissions;
      return !!userPermissions?.includes(permission);
    },
    [user, dataState.roles]
  );
  
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object' || obj instanceof Timestamp || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    }
    return newObj;
  }

  // tenantPath solo para features nuevas (ej: auditLogs como subcolección). No para carga de datos existentes.
  const tenantPath = useCallback(
    (col: string) => {
      const tenantId = getTenantId();
      if (['users', 'tenants', 'subscriptions', 'roles'].includes(col)) {
        return col; // Raíz para globals
      }
      if (!tenantId) return null;
      return `tenants/${tenantId}/${col}`; // Solo para subcolecciones nuevas
    },
    [getTenantId]
  );

  const logAction = useCallback(
    async (action: string, details: any) => {
      if (!user) return;
      
      const cleanedDetails = removeUndefined(details);

      try {
        await addDoc(collection(db, 'auditLogs'), {
          userId: user.id,
          userName: user.name,
          tenantId: getTenantId(),
          action,
          details: cleanedDetails,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to log action:', error);
      }
    },
    [user, getTenantId]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Limpia datos si no hay user
      Object.keys(dataState).forEach((key) => {
        if (!['isLoading', 'roles'].includes(key)) {
          dispatch({ type: 'SET_DATA', payload: { collection: key as any, data: [] } });
        }
      });
      setManualLots([]);
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    const tenantIdForQuery = getTenantId();
    const unsubs: (() => void)[] = [];

    // Colecciones GLOBALES: siempre raíz, sin filtro (roles, tenants)
    const globalCollections = ['tenants', 'roles'];
    globalCollections.forEach((name) => {
      const q = query(collection(db, name));
      unsubs.push(
        onSnapshot(
          q,
          (snapshot) => {
            if (name === 'roles') {
              if (snapshot.empty) {
                dispatch({ type: 'SET_ROLES', payload: ROLES_DEFAULT });
              } else {
                const fetchedRoles = snapshot.docs.reduce((acc, doc) => {
                  acc[doc.id] = doc.data();
                  return acc;
                }, {} as any);
                dispatch({ type: 'SET_ROLES', payload: fetchedRoles });
              }
            } else {
              const data = snapshot.docs.map((doc) =>
                convertTimestamps({ ...doc.data(), id: doc.id })
              );
              dispatch({
                type: 'SET_DATA',
                payload: { collection: name as any, data },
              });
            }
          },
          (error) => {
            console.error(`Error fetching global ${name}:`, error);
            notify(`Error cargando ${name}`, 'destructive');
          }
        )
      );
    });

    // USERS: especial, como en original
    const usersRef = collection(db, 'users');
    let usersQ: Query;
    if (!tenantIdForQuery && user.role === 'super-admin') {
      usersQ = query(usersRef); // Carga todos los users
    } else if (tenantIdForQuery) {
      usersQ = query(usersRef, where('tenantId', '==', tenantIdForQuery));
    } else {
      usersQ = query(usersRef, where('tenantId', '==', '')); // Vacío si no hay tenant
    }
    unsubs.push(
      onSnapshot(
        usersQ,
        (snapshot) => {
          const data = snapshot.docs.map((doc) =>
            convertTimestamps({ ...doc.data(), id: doc.id })
          );
          dispatch({
            type: 'SET_DATA',
            payload: { collection: 'users' as any, data },
          });
        },
        (error) => {
          console.error('Error fetching users:', error);
          notify('Error cargando usuarios', 'destructive');
        }
      )
    );

    // Resto de colecciones: tenant-specific, como en original
    const tenantSpecificCollections = [
      'materials',
      'tools',
      'toolLogs',
      'requests', // Usa 'requests' como en original, no 'materialRequests'
      'returnRequests',
      'purchaseRequests',
      'suppliers',
      'materialCategories',
      'units',
      'purchaseLots',
      'purchaseOrders',
      'supplierPayments',
      'attendanceLogs',
      'assignedChecklists',
      'safetyInspections',
      'checklistTemplates',
      'behaviorObservations',
    ];

    tenantSpecificCollections.forEach((name) => {
      const collRef = collection(db, name);
      let q: Query;
      if (!tenantIdForQuery && user.role === 'super-admin') {
        q = query(collRef); // Carga todos (multi-tenant view)
      } else if (tenantIdForQuery) {
        q = query(collRef, where('tenantId', '==', tenantIdForQuery));
      } else {
        q = query(collRef, where('tenantId', '==', '')); // Vacío
        dispatch({ type: 'SET_DATA', payload: { collection: name as any, data: [] } });
        return;
      }

      unsubs.push(
        onSnapshot(
          q,
          (snapshot) => {
            const data = snapshot.docs.map((doc) =>
              convertTimestamps({ ...doc.data(), id: doc.id })
            );
            dispatch({
              type: 'SET_DATA',
              payload: { collection: name as any, data },
            });
          },
          (error) => {
            console.error(`Error fetching ${name}:`, error);
            notify(`Error cargando ${name}`, 'destructive');
          }
        )
      );
    });

    // manualLots: no se carga de DB, se maneja client-side (como original)
    setManualLots([]);

    // Limpieza
    dispatch({ type: 'SET_LOADING', payload: false });
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [user, getTenantId, authLoading, notify]);

  const updateRolePermissions = async (
    role: keyof typeof ROLES_DEFAULT,
    permission: string,
    checked: boolean
  ) => {
    if (!can('permissions:manage'))
      throw new Error('No tienes permiso para gestionar permisos.');
  
    const roleRef = doc(db, "roles", role);
    
    // Get current permissions, either from DB or from default config
    const docSnap = await getDoc(roleRef);
    const currentPermissions = (docSnap.exists() ? docSnap.data().permissions : ROLES_DEFAULT[role]?.permissions) || [];
  
    let newPermissions: string[];
  
    if (checked) {
      // Add permission if it doesn't exist
      if (!currentPermissions.includes(permission)) {
        newPermissions = [...currentPermissions, permission];
      } else {
        return; // No changes needed
      }
    } else {
      // Remove permission
      newPermissions = currentPermissions.filter((p: string) => p !== permission);
    }
  
    // Use setDoc with merge to create/update the document in Firestore
    await setDoc(roleRef, { 
      description: ROLES_DEFAULT[role]?.description, // Keep description in sync
      permissions: newPermissions 
    }, { merge: true });
    
    await logAction('UPDATE_ROLE_PERMISSIONS', { role, permission, checked });
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
      await logAction('CREATE_TENANT', tenantData);
    } catch(err: any) {
      notify('Error al crear el suscriptor: ' + err.message, 'destructive');
      throw err;
    }
  };

  const updateUser = async (userId: string, data: Partial<Omit<User, "id" | "email" | "qrCode">>) => {
    if (!can('users:edit')) throw new Error('No tienes permiso para editar usuarios.');
    try {
      if (!userId) throw new Error("User ID is required");
      const userRef = doc(db, "users", userId);
      
      const updateData = removeUndefined({ ...data });
      
      if (data.fechaIngreso && !(data.fechaIngreso instanceof Timestamp)) {
        updateData.fechaIngreso = Timestamp.fromDate(new Date(data.fechaIngreso));
      }

      await updateDoc(userRef, updateData);
      notify("Usuario actualizado exitosamente.", "success");
      await logAction('UPDATE_USER', { userId, data });
    } catch (err: any) {
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
      await logAction('DELETE_USER', { userId });
    } catch (err: any) {
      notify("Error al eliminar usuario: " + err.message, "destructive");
      throw err;
    }
  };

  const addMaterial = async (material: Omit<Material, 'id' | 'tenantId' | 'category'> & { categoryId: string; justification?: string }) => {
    if (!can('materials:create')) throw new Error('No tienes permiso para crear materiales.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const categoryDoc = await getDoc(doc(db, "materialCategories", material.categoryId));
      if (!categoryDoc.exists()) throw new Error("Categoría no válida.");
      const categoryName = categoryDoc.data().name;

      const batch = writeBatch(db);
      const newMaterialRef = doc(collection(db, "materials"));

      const unitExists = (dataState.units as Unit[]).some(u => u.name.toLowerCase() === material.unit.toLowerCase());
      if (!unitExists) {
        const newUnitRef = doc(collection(db, "units"));
        batch.set(newUnitRef, { name: material.unit, id: newUnitRef.id, tenantId });
      }

      const { justification, categoryId, ...materialData } = material;
      batch.set(newMaterialRef, { ...materialData, category: categoryName, id: newMaterialRef.id, tenantId });

      if (material.stock > 0 && user) {
        const newPurchaseRequestRef = doc(collection(db, "purchaseRequests"));
        batch.set(newPurchaseRequestRef, {
          id: newPurchaseRequestRef.id,
          materialName: material.name,
          quantity: material.stock,
          unit: material.unit,
          category: categoryName,
          justification: justification || "Ingreso de stock inicial",
          area: "Bodega Central",
          supervisorId: user.id,
          status: "received",
          createdAt: Timestamp.now(),
          receivedAt: Timestamp.now(),
          lotId: null,
          tenantId,
        });
      }

      await batch.commit();
      notify("Material agregado exitosamente.", "success");
      await logAction('ADD_MATERIAL', { material });
    } catch (err: any) {
      notify("Error al agregar material: " + err.message, "destructive");
      throw err;
    }
  };

  const updateMaterial = async (materialId: string, data: Partial<Omit<Material, "id" | 'category'> & { categoryId?: string }>) => {
    if (!can('materials:edit')) throw new Error('No tienes permiso para editar materiales.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
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
        const unitExists = (dataState.units as Unit[]).some(u => u.name.toLowerCase() === data.unit!.toLowerCase());
        if (!unitExists) {
          const newUnitRef = doc(collection(db, "units"));
          batch.set(newUnitRef, { name: data.unit, id: newUnitRef.id, tenantId });
        }
      }
      
      batch.update(materialRef, updateData as any);

      await batch.commit();
      notify("Material actualizado exitosamente.", "success");
      await logAction('UPDATE_MATERIAL', { materialId, data });
    } catch (err: any) {
      notify("Error al actualizar material: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteMaterial = async (materialId: string) => {
    if (!can('materials:delete')) throw new Error('No tienes permiso para eliminar materiales.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
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
      await logAction('DELETE_MATERIAL', { materialId });
    } catch (err: any) {
      notify("Error al eliminar material: " + err.message, "destructive");
      throw err;
    }
  };

  const addManualStockEntry = async (materialId: string, quantity: number, justification: string) => {
    if (!can('stock:add_manual')) throw new Error('No tienes permiso para agregar stock manualmente.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      if (!user) throw new Error("Acción no autorizada.");
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
        supervisorId: user.id,
        status: "received",
        createdAt: Timestamp.now(),
        receivedAt: Timestamp.now(),
        lotId: null,
        tenantId,
      });

      await batch.commit();
      notify("Stock manual agregado exitosamente.", "success");
      await logAction('ADD_MANUAL_STOCK', { materialId, quantity, justification });
    } catch (err: any) {
      notify("Error al agregar stock manual: " + err.message, "destructive");
      throw err;
    }
  };

  const addMaterialCategory = async (name: string) => {
    if (!can('categories:create')) throw new Error('No tienes permiso para crear categorías.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "materialCategories"));
      await setDoc(newDocRef, { name, id: newDocRef.id, tenantId });
      notify("Categoría de material agregada exitosamente.", "success");
      await logAction('ADD_MATERIAL_CATEGORY', { name });
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
      await logAction('UPDATE_MATERIAL_CATEGORY', { id, name });
    } catch (err: any) {
      notify("Error al actualizar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteMaterialCategory = async (id: string) => {
    if (!can('categories:delete')) throw new Error('No tienes permiso para eliminar categorías.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const categoryRef = doc(db, "materialCategories", id);
      const categoryDoc = await getDoc(categoryRef);
      if (!categoryDoc.exists()) return;
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
      await logAction('DELETE_MATERIAL_CATEGORY', { id });
    } catch (err: any) {
      notify("Error al eliminar categoría de material: " + err.message, "destructive");
      throw err;
    }
  };

  const addUnit = async (name: string) => {
    if (!can('units:create')) throw new Error('No tienes permiso para crear unidades.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const unitExists = (dataState.units as Unit[]).some(u => u.name.toLowerCase() === name.toLowerCase());
      if (unitExists) {
        notify(`La unidad "${name}" ya existe.`, "default");
        return;
      }
      const newDocRef = doc(collection(db, "units"));
      await setDoc(newDocRef, { name, id: newDocRef.id, tenantId });
      notify("Unidad agregada exitosamente.", "success");
      await logAction('ADD_UNIT', { name });
    } catch (err: any) {
      notify("Error al agregar unidad: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteUnit = async (id: string) => {
    if (!can('units:delete')) throw new Error('No tienes permiso para eliminar unidades.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const unitRef = doc(db, "units", id);
      const unitDoc = await getDoc(unitRef);
      if (!unitDoc.exists()) return;
      const unit = unitDoc.data() as Unit;
      
      const materialsWithUnit = await getDocs(query(collection(db, "materials"), where("unit", "==", unit.name), where('tenantId', '==', tenantId)));
      if (!materialsWithUnit.empty) {
        throw new Error("No se puede eliminar: la unidad está en uso en uno o más materiales.");
      }
      
      await deleteDoc(unitRef);
      notify("Unidad eliminada exitosamente.", "success");
      await logAction('DELETE_UNIT', { id });
    } catch (err: any) {
      notify("Error al eliminar la unidad: " + err.message, "destructive");
      throw err;
    }
  };

  const addTool = async (toolName: string) => {
    if (!can('tools:create')) throw new Error('No tienes permiso para crear herramientas.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "tools"));
      const normalizedToolName = toolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '');
      await setDoc(newDocRef, {
        id: newDocRef.id,
        name: toolName,
        qrCode: `TOOL-${normalizedToolName}-${nanoid(4)}`,
        tenantId,
      });
      notify("Herramienta agregada exitosamente.", "success");
      await logAction('ADD_TOOL', { toolName });
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
      await updateDoc(toolRef, data as any);
      notify("Herramienta actualizada exitosamente.", "success");
      await logAction('UPDATE_TOOL', { toolId, data });
    } catch (err: any) {
      notify("Error al actualizar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteTool = async (toolId: string) => {
    if (!can('tools:delete')) throw new Error('No tienes permiso para eliminar herramientas.');
    try {
      if (!toolId) throw new Error("Tool ID is required");
      const isToolInUse = (dataState.toolLogs as ToolLog[]).some((log) => log.toolId === toolId && log.returnDate === null);
      if (isToolInUse) {
        throw new Error("No se puede eliminar una herramienta que está actualmente en uso.");
      }
      const toolRef = doc(db, "tools", toolId);
      await deleteDoc(toolRef);
      notify("Herramienta eliminada exitosamente.", "success");
      await logAction('DELETE_TOOL', { toolId });
    } catch (err: any) {
      notify("Error al eliminar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const checkoutTool = async (toolId: string, workerId: string, supervisorId: string) => {
    if (!can('tools:checkout')) throw new Error('No tienes permiso para entregar herramientas.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "toolLogs"));
      const worker = (dataState.users as User[]).find(u => u.id === workerId);
      const tool = (dataState.tools as Tool[]).find(t => t.id === toolId);

      await setDoc(newDocRef, {
        id: newDocRef.id,
        toolId,
        toolName: tool?.name || "N/A",
        userId: workerId,
        userName: worker?.name || "N/A",
        supervisorId,
        checkoutDate: Timestamp.now(),
        returnDate: null,
        tenantId,
      });
      notify("Herramienta asignada exitosamente.", "success");
      await logAction('CHECKOUT_TOOL', { toolId, workerId, supervisorId });
    } catch (err: any) {
      notify("Error al asignar herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const returnTool = async (logId: string, returnStatus: 'ok' | 'damaged' = "ok", notes: string = "") => {
    if (!can('tools:return')) throw new Error('No tienes permiso para devolver herramientas.');
    try {
      const logRef = doc(db, "toolLogs", logId);
      const supervisor = user;
      await updateDoc(logRef, {
        returnDate: Timestamp.now(),
        returnStatus: returnStatus,
        returnNotes: notes,
        returnSupervisorId: supervisor?.id,
        returnSupervisorName: supervisor?.name
      });
      notify("Herramienta devuelta exitosamente.", "success");
      await logAction('RETURN_TOOL', { logId, returnStatus, notes });
    } catch (err: any) {
      notify("Error al devolver herramienta: " + err.message, "destructive");
      throw err;
    }
  };

  const findActiveLogForTool = async (toolId: string): Promise<ToolLog | null> => {
    const tenantId = getTenantId();
    if (!tenantId) return null;
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
      const docData = querySnapshot.docs[0].data();
      return convertTimestamps({ ...docData, id: querySnapshot.docs[0].id }) as ToolLog;
    } catch (error) {
      console.error("Error finding active log for tool:", error);
      notify("Error al buscar la herramienta prestada: " + (error as Error).message, "destructive");
      return null;
    }
  };

  const addMaterialRequest = async (request: Omit<MaterialRequest, "id" | "status" | "createdAt" | "tenantId">) => {
    if (!can('material_requests:create')) throw new Error('No tienes permiso para crear solicitudes de material.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
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
      await logAction('ADD_MATERIAL_REQUEST', { request });
    } catch (err: any) {
      notify("Error al agregar solicitud de material: " + err.message, "destructive");
      throw err;
    }
  };

  const updateMaterialRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!can('material_requests:approve')) throw new Error('No tienes permiso para aprobar solicitudes de material.');
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const requestRef = doc(db, "requests", requestId);
      const requestDoc = await getDoc(requestRef);
      if (!requestDoc.exists()) throw new Error("Solicitud no encontrada");
      
      const batch = writeBatch(db);

      if (status === 'approved') {
          const request = requestDoc.data() as MaterialRequest;
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
      }

      batch.update(requestRef, { status: status, approvalDate: status === 'approved' ? Timestamp.now() : null, approverId: user.id });
      await batch.commit();
      notify(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`, "success");
      await logAction('UPDATE_MATERIAL_REQUEST_STATUS', { requestId, status });
    } catch (err: any) {
      notify("Error al actualizar solicitud: " + err.message, "destructive");
      throw err;
    }
  };

  const addReturnRequest = async (items: { materialId: string; materialName: string, quantity: number, unit: string }[], notes: string) => {
    if (!can('return_requests:create')) throw new Error('No tienes permiso para crear devoluciones.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    if (!user) throw new Error("Usuario no autenticado.");

    try {
        const batch = writeBatch(db);
        items.forEach(item => {
            const newDocRef = doc(collection(db, "returnRequests"));
            batch.set(newDocRef, {
                id: newDocRef.id,
                supervisorId: user.id,
                supervisorName: user.name,
                materialId: item.materialId,
                materialName: item.materialName,
                quantity: item.quantity,
                unit: item.unit,
                status: "pending",
                notes: notes,
                createdAt: Timestamp.now(),
                tenantId,
            });
        });
        
        await batch.commit();
        notify("Solicitud de devolución enviada para confirmación.", "success");
        await logAction('ADD_RETURN_REQUEST', { items, notes });
    } catch (err: any) {
        notify("Error al enviar la solicitud de devolución: " + err.message, "destructive");
        throw err;
    }
  };

  const updateReturnRequestStatus = async (requestId: string, status: 'completed' | 'rejected') => {
    if (!can('return_requests:approve')) throw new Error('No tienes permiso para gestionar devoluciones.');
    if (!user) throw new Error("Usuario no autenticado.");

    try {
      const requestRef = doc(db, "returnRequests", requestId);
      const requestDoc = await getDoc(requestRef);
      if (!requestDoc.exists()) throw new Error("Solicitud de devolución no encontrada");

      const batch = writeBatch(db);
      
      if (status === 'completed') {
        const request = requestDoc.data() as ReturnRequest;
        const materialRef = doc(db, "materials", request.materialId);
        const materialDoc = await getDoc(materialRef);
        if (materialDoc.exists()) {
            const material = materialDoc.data() as Material;
            const newStock = material.stock + request.quantity;
            batch.update(materialRef, { stock: newStock });
        } else {
            console.warn(`Material con ID ${request.materialId} no encontrado al devolver.`);
        }
      }

      batch.update(requestRef, { status, completionDate: status === 'completed' ? Timestamp.now() : null, handlerId: user.id, handlerName: user.name });
      await batch.commit();
      notify(`Solicitud de devolución ${status === 'completed' ? 'completada' : 'rechazada'}.`, "success");
      await logAction('UPDATE_RETURN_REQUEST_STATUS', { requestId, status });
    } catch (err: any) {
      notify("Error al actualizar solicitud de devolución: " + err.message, "destructive");
      throw err;
    }
  };

  const addPurchaseRequest = async (request: Omit<PurchaseRequest, "id" | "status" | "createdAt" | "receivedAt" | "lotId" | "tenantId">) => {
    if (!can('purchase_requests:create')) throw new Error('No tienes permiso para crear solicitudes de compra.');
    if (!user) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const batch = writeBatch(db);
      const newDocRef = doc(collection(db, "purchaseRequests"));

      if (request.unit) {
        const unitExists = (dataState.units as Unit[]).some(u => u.name.toLowerCase() === request.unit!.toLowerCase());
        if (!unitExists) {
          const newUnitRef = doc(collection(db, "units"));
          batch.set(newUnitRef, { name: request.unit, id: newUnitRef.id, tenantId });
        }
      }

      batch.set(newDocRef, {
        ...request,
        id: newDocRef.id,
        supervisorId: user.id,
        requesterName: user.name,
        status: "pending",
        createdAt: Timestamp.now(),
        receivedAt: null,
        lotId: null,
        tenantId,
      });

      await batch.commit();

      notify("Solicitud de compra agregada exitosamente.", "success");
      await logAction('ADD_PURCHASE_REQUEST', { request });
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
    if (!user) throw new Error("Acción no autorizada.");
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const requestRef = doc(db, "purchaseRequests", id);
      const originalRequest = (dataState.purchaseRequests as PurchaseRequest[]).find((pr) => pr.id === id);
      if (!originalRequest) throw new Error("Solicitud original no encontrada.");

      const batch = writeBatch(db);
      let updateData: any = { ...data };

      if (data?.unit) {
        const unitExists = (dataState.units as Unit[]).some(u => u.name.toLowerCase() === data.unit!.toLowerCase());
        if (!unitExists) {
          const newUnitRef = doc(collection(db, "units"));
          batch.set(newUnitRef, { name: data.unit, id: newUnitRef.id, tenantId });
        }
      }

      if (originalRequest.status !== status) {
        updateData.status = status;
        updateData.approverId = user.id;
        updateData.approverName = user.name;
        updateData.approvalDate = Timestamp.now();
      }

      if (data?.quantity && data.quantity !== originalRequest.quantity && originalRequest.originalQuantity === undefined) {
        updateData.originalQuantity = originalRequest.quantity;
      }
      
      batch.update(requestRef, updateData);
      await batch.commit();
      notify("Solicitud de compra actualizada exitosamente.", "success");
      await logAction('UPDATE_PURCHASE_REQUEST_STATUS', { id, status, data });
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
      await logAction('DELETE_PURCHASE_REQUEST', { id });
    } catch (error: any) {
      notify('Error al eliminar la solicitud: ' + error.message, 'destructive');
      throw error;
    }
  };

  const receivePurchaseRequest = async (purchaseRequestId: string, receivedQuantity: number, existingMaterialId?: string) => {
    if (!can('stock:receive_order')) throw new Error('No tienes permiso para recibir órdenes.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
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
      await logAction('RECEIVE_PURCHASE_REQUEST', { purchaseRequestId, receivedQuantity, existingMaterialId });
    } catch (err: any) {
      notify("Error al recibir la solicitud: " + err.message, "destructive");
      throw err;
    }
  };

  const generatePurchaseOrder = async (requests: PurchaseRequest[], supplierId: string) => {
    if (!can('orders:create')) throw new Error('No tienes permiso para crear órdenes de compra.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
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
      await logAction('GENERATE_PURCHASE_ORDER', { supplierId, requestIds: requests.map(r => r.id) });
      return newOrderRef.id;
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

      if (orderData.requestIds) {
          for (const reqId of orderData.requestIds) {
            const reqRef = doc(db, "purchaseRequests", reqId);
            const reqDoc = await getDoc(reqRef);
            if (reqDoc.exists()) {
              batch.update(reqRef, { status: "batched" });
            }
          }
      }

      batch.delete(orderRef);
      
      await batch.commit();
      notify("Orden de compra anulada. Las solicitudes han vuelto a su lote.", "success");
      await logAction('CANCEL_PURCHASE_ORDER', { orderId });
    } catch (err: any) {
      notify("Error al anular la orden de compra: " + err.message, "destructive");
      throw err;
    }
  };

  const addSupplier = async (data: Partial<Omit<Supplier, 'id' | 'tenantId'>>) => {
    if (!can('suppliers:create')) throw new Error('No tienes permiso para crear proveedores.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "suppliers"));
      await setDoc(newDocRef, { ...data, id: newDocRef.id, tenantId });
      notify("Proveedor agregado exitosamente.", "success");
      await logAction('ADD_SUPPLIER', { data });
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
      await updateDoc(supplierRef, data as any);
      notify("Proveedor actualizado exitosamente.", "success");
      await logAction('UPDATE_SUPPLIER', { supplierId, data });
    } catch (err: any) {
      notify("Error al actualizar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    if (!can('suppliers:delete')) throw new Error('No tienes permiso para eliminar proveedores.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      if (!supplierId) throw new Error("Supplier ID is required");
      const isSupplierInUse = (dataState.materials as Material[]).some((m) => m.supplierId === supplierId);
      if (isSupplierInUse) {
        throw new Error("No se puede eliminar. El proveedor está asignado a uno o más materiales.");
      }
      const supplierRef = doc(db, "suppliers", supplierId);
      await deleteDoc(supplierRef);
      notify("Proveedor eliminado exitosamente.", "success");
      await logAction('DELETE_SUPPLIER', { supplierId });
    } catch (err: any) {
      notify("Error al eliminar proveedor: " + err.message, "destructive");
      throw err;
    }
  };

  const createLot = async (lotName: string) => {
    if (!can('lots:create')) throw new Error('No tienes permiso para crear lotes.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const lotId = `manual-${lotName.replace(/\s+/g, '-').toLowerCase()}`;
      const lotRef = doc(db, 'purchaseLots', lotId);
      const lotDoc = await getDoc(lotRef);

      if (lotDoc.exists()) {
        throw new Error('Ya existe un lote con un nombre similar.');
      }
      
      await setDoc(lotRef, {
        id: lotId,
        name: lotName,
        createdAt: Timestamp.now(),
        creatorId: user?.id,
        creatorName: user?.name,
        status: 'open',
        tenantId: tenantId,
      });

      notify('Lote manual creado. Ahora puedes asignarle solicitudes.', 'success');
      await logAction('CREATE_LOT_MANUAL', { lotName, lotId });
    } catch (error: any) {
      notify('Error al crear el lote manual: ' + error.message, 'destructive');
      throw error;
    }
  };

  const addRequestToLot = async (requestId: string, lotId: string) => {
    if (!can('lots:assign')) throw new Error('No tienes permiso para asignar solicitudes a lotes.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const lotRef = doc(db, 'purchaseLots', lotId);
      const lotDoc = await getDoc(lotRef);
      if (!lotDoc.exists()) {
        const newLotData = {
          id: lotId,
          name: lotId,
          createdAt: Timestamp.now(),
          creatorId: user?.id,
          creatorName: user?.name,
          status: 'open',
          tenantId: tenantId,
        };
        await setDoc(lotRef, newLotData);
      }
      
      const requestRef = doc(db, 'purchaseRequests', requestId);
      await updateDoc(requestRef, {
        lotId: lotId,
        status: 'batched',
      });

      notify('Solicitud añadida al lote.', 'success');
      await logAction('ADD_REQUEST_TO_LOT', { requestId, lotId });
    } catch (error: any) {
      notify('Error al añadir al lote: ' + error.message, 'destructive');
      throw error;
    }
  };

  const removeRequestFromLot = async (requestId: string) => {
    if (!can('lots:assign')) throw new Error('No tienes permiso para quitar solicitudes de lotes.');
    try {
      const requestRef = doc(db, 'purchaseRequests', requestId);
      await updateDoc(requestRef, {
        lotId: null,
        status: 'approved',
      });
      notify('Solicitud devuelta a la lista de aprobadas.', 'success');
      await logAction('REMOVE_REQUEST_FROM_LOT', { requestId });
    } catch (error: any) {
      notify('Error al quitar del lote: ' + error.message, 'destructive');
      throw error;
    }
  };
  
  const deleteLot = async (lotId: string) => {
      if (!can('lots:delete')) throw new Error('No tienes permiso para eliminar lotes.');
      try {
        const lotRef = doc(db, 'purchaseLots', lotId);
        const lotDoc = await getDoc(lotRef);
        if(!lotDoc.exists()) throw new Error("El lote no existe.");
        
        // Find all requests in this lot and revert them
        const requestsQuery = query(
            collection(db, 'purchaseRequests'), 
            where('lotId', '==', lotId)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        
        const batch = writeBatch(db);
        requestsSnapshot.forEach(doc => {
            batch.update(doc.ref, { lotId: null, status: 'approved' });
        });
        
        batch.delete(lotRef);
        await batch.commit();

        notify(`Lote eliminado. ${requestsSnapshot.size} solicitudes han vuelto al estado 'Aprobado'.`, 'success');
        await logAction('DELETE_LOT', { lotId });
    } catch (error: any) {
      notify('Error al eliminar el lote: ' + error.message, 'destructive');
      throw error;
    }
  }

  const addSupplierPayment = async (data: Omit<SupplierPayment, 'id' | 'status' | 'tenantId' | 'createdAt' | 'issueDate' | 'dueDate'> & { issueDate: Date; dueDate: Date }) => {
    if (!can('payments:create')) throw new Error('No tienes permiso para registrar pagos.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newPaymentRef = doc(collection(db, "supplierPayments"));
      
      await setDoc(newPaymentRef, {
        ...data,
        id: newPaymentRef.id,
        status: 'pending',
        createdAt: Timestamp.now(),
        tenantId,
      });

      notify("Factura registrada correctamente.", "success");
    } catch (err: any) {
      notify("Error al registrar la factura: " + err.message, "destructive");
      throw err;
    }
  };

  const updateSupplierPayment = async (id: string, data: Partial<SupplierPayment>) => {
    if (!can('payments:edit')) throw new Error('No tienes permiso para editar facturas.');
    try {
      const paymentRef = doc(db, "supplierPayments", id);
      await updateDoc(paymentRef, data as any);
      notify("Factura actualizada exitosamente.", "success");
    } catch (err: any) {
      notify("Error al actualizar la factura: " + err.message, "destructive");
      throw err;
    }
  };

  const markPaymentAsPaid = async (id: string, details: { paymentDate: Date, paymentMethod: string }) => {
    if (!can('payments:mark_as_paid')) throw new Error('No tienes permiso para marcar como pagado.');
    try {
      const paymentRef = doc(db, "supplierPayments", id);
      await updateDoc(paymentRef, {
        status: "paid",
        paymentDate: Timestamp.fromDate(details.paymentDate),
        paymentMethod: details.paymentMethod,
      });
      notify("Factura marcada como pagada.", "success");
    } catch (err: any) {
      notify("Error al marcar la factura como pagada: " + err.message, "destructive");
      throw err;
    }
  };

  const deleteSupplierPayment = async (id: string) => {
    if (!can('payments:delete')) throw new Error('No tienes permiso para eliminar facturas.');
    try {
      const paymentRef = doc(db, "supplierPayments", id);
      await deleteDoc(paymentRef);
      notify("Factura eliminada.", "success");
    } catch (err: any) {
      notify("Error al eliminar la factura: " + err.message, "destructive");
      throw err;
    }
  };
  
  const addChecklistTemplate = async (template: { title: string, items: { element: string }[] }) => {
    if (!can('safety_templates:create')) throw new Error('No tienes permiso para crear plantillas.');
    if (!user) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "checklistTemplates"));
      await setDoc(newDocRef, {
        ...template,
        id: newDocRef.id,
        createdBy: user.id,
        createdAt: Timestamp.now(),
        tenantId,
      });
      notify("Plantilla de checklist creada.", "success");
    } catch (err: any) {
      notify("Error al crear la plantilla: " + err.message, "destructive");
      throw err;
    }
  };
  
   const deleteChecklistTemplate = async (templateId: string) => {
    if (!can('safety_templates:create')) throw new Error('No tienes permiso para eliminar plantillas.');
    try {
      const templateRef = doc(db, "checklistTemplates", templateId);
      await deleteDoc(templateRef);
      notify("Plantilla eliminada.", "success");
    } catch (err: any) {
      notify("Error al eliminar la plantilla: " + err.message, "destructive");
      throw err;
    }
  };


  const assignChecklistToSupervisors = async (template: ChecklistTemplate, supervisorIds: string[], work: string) => {
    if (!can('safety_templates:assign')) throw new Error('No tienes permiso para asignar checklists.');
    if (!user) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const batch = writeBatch(db);
      for (const supervisorId of supervisorIds) {
        const newDocRef = doc(collection(db, "assignedChecklists"));
        const assignedTask: Omit<AssignedSafetyTask, "id" | "tenantId"> = {
          templateId: template.id,
          templateTitle: template.title,
          supervisorId: supervisorId,
          assignerId: user.id,
          assignerName: user.name,
          createdAt: Timestamp.now(),
          status: 'assigned',
          area: work,
          items: template.items.map(item => ({...item, yes: false, no: false, na: false, responsibleUserId: null, completionDate: null})),
        };
        batch.set(newDocRef, { ...assignedTask, id: newDocRef.id, tenantId });
      }
      await batch.commit();
      notify("Checklists asignados correctamente.", "success");
    } catch (err: any) {
      notify("Error al asignar checklists: " + err.message, "destructive");
      throw err;
    }
  };

  const completeAssignedChecklist = async (data: AssignedSafetyTask) => {
    if (!can('safety_checklists:complete')) throw new Error('No tienes permiso para completar checklists.');
    try {
      const checklistRef = doc(db, "assignedChecklists", data.id);
      await updateDoc(checklistRef, {
        ...data,
        status: 'completed',
        completedAt: Timestamp.now(),
      } as any);
      notify("Checklist completado y enviado para revisión.", "success");
    } catch (err: any) {
      notify("Error al completar el checklist: " + err.message, "destructive");
      throw err;
    }
  };

  const reviewAssignedChecklist = async (checklistId: string, status: 'approved' | 'rejected', notes: string, signature: string) => {
    if (!can('safety_checklists:review')) throw new Error('No tienes permiso para revisar checklists.');
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const checklistRef = doc(db, "assignedChecklists", checklistId);
      await updateDoc(checklistRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : null,
        reviewedBy: {
          id: user.id,
          name: user.name,
          signature: signature,
          date: Timestamp.now(),
        },
      });
      notify(`Checklist ${status === 'approved' ? 'aprobado' : 'rechazado'}.`, "success");
    } catch (err: any) {
      notify("Error al revisar el checklist: " + err.message, "destructive");
      throw err;
    }
  };
  
  const deleteAssignedChecklist = async (id: string) => {
    if (user?.role !== 'admin' && user?.role !== 'super-admin') throw new Error('Acción no autorizada.');
    try {
      await deleteDoc(doc(db, 'assignedChecklists', id));
      notify('Tarea asignada eliminada.', 'success');
    } catch (error: any) {
      notify('Error al eliminar la tarea: ' + error.message, 'destructive');
    }
  };

  const addChecklist = async (checklist: Omit<Checklist, "id" | "createdBy">) => {
    // Legacy function, might not be needed.
  };

  const addSafetyInspection = async (data: Omit<SafetyInspection, "id" | "status" | "createdAt" | "createdBy" | "tenantId">) => {
    if (!can('safety_inspections:create')) throw new Error('No tienes permiso para crear inspecciones.');
    if (!user) throw new Error("Usuario no autenticado.");
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
      const newDocRef = doc(collection(db, "safetyInspections"));
      await setDoc(newDocRef, {
        ...data,
        id: newDocRef.id,
        status: 'open',
        createdAt: Timestamp.now(),
        createdBy: user.id,
        tenantId,
      });
      notify("Inspección de seguridad registrada y asignada.", "success");
    } catch (err: any) {
      notify("Error al registrar la inspección: " + err.message, "destructive");
      throw err;
    }
  };

  const completeSafetyInspection = async (id: string, data: Pick<SafetyInspection, 'completionNotes' | 'completionSignature' | 'completionExecutor' | 'completionPhotos'>) => {
    if (!can('safety_inspections:complete')) throw new Error('No tienes permiso para completar inspecciones.');
    try {
      const inspectionRef = doc(db, "safetyInspections", id);
      await updateDoc(inspectionRef, {
        ...data,
        status: 'completed',
        completedAt: Timestamp.now(),
      });
      notify("Inspección completada y enviada para revisión.", "success");
    } catch (err: any) {
      notify("Error al completar la inspección: " + err.message, "destructive");
      throw err;
    }
  };

  const reviewSafetyInspection = async (inspectionId: string, status: 'approved' | 'rejected', notes: string, signature: string) => {
    if (!can('safety_inspections:review')) throw new Error('No tienes permiso para revisar inspecciones.');
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const inspectionRef = doc(db, "safetyInspections", inspectionId);
      await updateDoc(inspectionRef, {
        status,
        rejectionNotes: status === 'rejected' ? notes : null,
        reviewedBy: {
          id: user.id,
          name: user.name,
          signature: signature,
          date: Timestamp.now(),
        },
      });
      notify(`Inspección ${status === 'approved' ? 'aprobada' : 'rechazada'}.`, "success");
    } catch (err: any) {
      notify("Error al revisar la inspección: " + err.message, "destructive");
      throw err;
    }
  };
  
  const addBehaviorObservation = async (data: Omit<BehaviorObservation, 'id' | 'observerId' | 'observerName' | 'createdAt' | 'tenantId'>) => {
      if (!can('safety_observations:create')) throw new Error('No tienes permiso para crear observaciones.');
      if (!user) throw new Error("Usuario no autenticado.");
      const tenantId = getTenantId();
      if (!tenantId) throw new Error("Tenant ID no disponible.");
      try {
          const newDocRef = doc(collection(db, "behaviorObservations"));
          await setDoc(newDocRef, {
              ...data,
              id: newDocRef.id,
              observerId: user.id,
              observerName: user.name,
              createdAt: Timestamp.now(),
              tenantId
          });
          notify("Observación de conducta registrada.", "success");
      } catch (err: any) {
          notify("Error al registrar la observación: " + err.message, "destructive");
          throw err;
      }
  };


  const addManualAttendance = async (userId: string, date: Date, time: string, type: 'in' | 'out') => {
    if (!can('attendance:edit')) throw new Error('No tienes permiso para agregar registros manualmente.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    try {
        const [hours, minutes] = time.split(':').map(Number);
        const timestamp = new Date(date);
        timestamp.setHours(hours, minutes, 0, 0);

        const newDocRef = doc(collection(db, "attendanceLogs"));
        await setDoc(newDocRef, {
            id: newDocRef.id,
            userId,
            userName: (dataState.users as User[]).find(u => u.id === userId)?.name || 'N/A',
            timestamp: Timestamp.fromDate(timestamp),
            type,
            method: 'manual',
            registrarId: user?.id,
            registrarName: user?.name,
            date: format(date, 'yyyy-MM-dd'),
            tenantId
        });
        notify("Registro manual añadido.", "success");
    } catch (err: any) {
        notify("Error al añadir registro: " + err.message, "destructive");
        throw err;
    }
  };
  
  const handleAttendanceScan = async (qrCode: string) => {
    if (!can('attendance:register')) throw new Error('No tienes permiso para registrar asistencia.');
    const tenantId = getTenantId();
    if (!tenantId) throw new Error("Tenant ID no disponible.");
    if (!user) throw new Error("Usuario no autenticado.");

    try {
      const scannedUserId = qrCode.replace('USER-', '');
      const userToLog = (dataState.users as User[]).find(u => u.id === scannedUserId);

      if (!userToLog) {
        throw new Error('Usuario no encontrado o QR no válido.');
      }
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const userLogsToday = (dataState.attendanceLogs as AttendanceLog[]).filter(
        (l: AttendanceLog) => l.userId === scannedUserId && l.date === todayStr
      ).sort((a,b) => (a.timestamp as Timestamp).toMillis() - (b.timestamp as Timestamp).toMillis());

      const lastLog = userLogsToday[userLogsToday.length - 1];
      const newLogType = !lastLog || lastLog.type === 'out' ? 'in' : 'out';

      const newDocRef = doc(collection(db, "attendanceLogs"));
      await setDoc(newDocRef, {
            id: newDocRef.id,
            userId: scannedUserId,
            userName: userToLog.name,
            timestamp: Timestamp.now(),
            type: newLogType,
            method: 'qr',
            registrarId: user.id,
            registrarName: user.name,
            date: todayStr,
            tenantId,
        });

      notify(`Registro de ${newLogType === 'in' ? 'entrada' : 'salida'} para ${userToLog.name} exitoso.`, "success");
    } catch (err: any) {
      notify(`Error en el escaneo: ` + err.message, "destructive");
    }
  };
  
    const updateAttendanceLog = async (logId: string, newTimestamp: Date, newType: 'in' | 'out', originalTimestamp: Date) => {
        if (!can('attendance:edit')) throw new Error('No tienes permiso para editar registros.');
        try {
            const logRef = doc(db, 'attendanceLogs', logId);
            await updateDoc(logRef, {
                timestamp: Timestamp.fromDate(newTimestamp),
                type: newType,
                originalTimestamp: Timestamp.fromDate(originalTimestamp),
                modifiedAt: Timestamp.now(),
                modifiedBy: user?.id,
            });
            notify('Registro actualizado.', 'success');
        } catch (error: any) {
            notify('Error al actualizar: ' + error.message, 'destructive');
            throw error;
        }
    };
    
    const deleteAttendanceLog = async (logId: string) => {
        if (!can('attendance:edit')) throw new Error('No tienes permiso para eliminar registros.');
        try {
            await deleteDoc(doc(db, 'attendanceLogs', logId));
            notify('Registro eliminado.', 'success');
        } catch (error: any) {
            notify('Error al eliminar: ' + error.message, 'destructive');
            throw error;
        }
    };


  const value: AppStateContextType = {
    ...dataState,
    isLoading: dataState.isLoading,
    roles: dataState.roles,
    can,
    manualLots,
    updateRolePermissions,
    addTenant,
    updateUser,
    deleteUser,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addManualStockEntry,
    addMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
    addUnit,
    deleteUnit,
    addTool,
    updateTool,
    deleteTool,
    checkoutTool,
    returnTool,
    findActiveLogForTool,
    addMaterialRequest,
    updateMaterialRequestStatus,
    addReturnRequest,
    updateReturnRequestStatus,
    addPurchaseRequest,
    updatePurchaseRequestStatus,
    deletePurchaseRequest,
    receivePurchaseRequest,
    generatePurchaseOrder,
    cancelPurchaseOrder,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    createLot,
    addRequestToLot,
    removeRequestFromLot,
    deleteLot,
    addSupplierPayment,
    updateSupplierPayment,
    markPaymentAsPaid,
    deleteSupplierPayment,
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
    addBehaviorObservation,
    addManualAttendance,
    handleAttendanceScan,
    updateAttendanceLog,
    deleteAttendanceLog,
    notify,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </AuthProvider>
  );
}
