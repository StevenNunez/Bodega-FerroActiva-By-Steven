"use client";
import React, {
  createContext,
  useReducer,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onSnapshot,
  collection,
  query,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail,
  type User as FirebaseAuthUser
} from 'firebase/auth';
import { db, auth } from '@/modules/core/lib/firebase';
import {
  User,
  UserRole,
  Tenant,
  SubscriptionPlan,
  WorkItem,
  ProgressLog,
} from '@/modules/core/lib/data';
import {
  ROLES as ROLES_DEFAULT,
  Permission,
  PLANS,
} from '@/modules/core/lib/permissions';

import { useAuth } from "@/modules/core/contexts/app-provider";
import { useToast } from "@/modules/core/hooks/use-toast";
import {
  useMaterials,
  useTools,
  usePurchaseRequests,
  useUsers,
  useToolLogs,
  useMaterialRequests,
  useReturnRequests,
  useSuppliers,
  useMaterialCategories,
  useUnits,
  usePurchaseLots,
  usePurchaseOrders,
  useSupplierPayments,
  useSalaryAdvances,
  useAttendanceLogs,
  useAssignedChecklists,
  useSafetyInspections,
  useChecklistTemplates,
  useBehaviorObservations,
  useStockMovements,
  useSubscriptionPlans,
  useWorkItems,
  useProgressLogs,
  useRoles,
} from "./collections";
import { AppDataState, AppStateAction, AppStateContextType } from './types';
import * as materialRequestMutations from './mutations/materialRequestMutations';
import * as purchaseRequestMutations from './mutations/purchaseRequestMutations';
import * as genericMutations from './mutations/genericMutations';
import * as toolMutations from './mutations/toolMutations';
import * as safetyMutations from './mutations/safetyMutations';
import * as attendanceMutations from './mutations/attendanceMutations';
import * as paymentMutations from './mutations/paymentMutations';
import { WORK_ITEMS_SEED } from '@/lib/work-items-seed';

const initialState: AppDataState = {
    isLoading: true,
    roles: ROLES_DEFAULT,
    subscriptionPlans: PLANS,
    users: [],
    materials: [],
    tools: [],
    toolLogs: [],
    requests: [],
    returnRequests: [],
    purchaseRequests: [],
    suppliers: [],
    materialCategories: [],
    units: [],
    purchaseLots: [],
    purchaseOrders: [],
    supplierPayments: [],
    salaryAdvances: [],
    attendanceLogs: [],
    assignedChecklists: [],
    safetyInspections: [],
    checklistTemplates: [],
    behaviorObservations: [],
    stockMovements: [],
    workItems: [],
    progressLogs: [],
};

const appReducer = (state: AppDataState, action: AppStateAction): AppDataState => {
    switch (action.type) {
        case 'SET_DATA':
            return { ...state, [action.payload.collection]: action.payload.data };
        case 'SET_ROLES':
            return { ...state, roles: action.payload };
        case 'SET_PLANS':
            return { ...state, subscriptionPlans: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
};

export const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user, getTenantId, can, authLoading } = useAuth();
    const [state, dispatch] = useReducer(appReducer, initialState);
    const { toast } = useToast();

    const tenantId = getTenantId();

    // Hooks de colecciones
    const usersData = useUsers(tenantId);
    const materialsData = useMaterials(tenantId);
    const toolsData = useTools(tenantId);
    const toolLogsData = useToolLogs(tenantId);
    const requestsData = useMaterialRequests(tenantId);
    const returnRequestsData = useReturnRequests(tenantId);
    const purchaseRequestsData = usePurchaseRequests(tenantId);
    const suppliersData = useSuppliers(tenantId);
    const materialCategoriesData = useMaterialCategories(tenantId);
    const unitsData = useUnits(tenantId);
    const purchaseLotsData = usePurchaseLots(tenantId);
    const purchaseOrdersData = usePurchaseOrders(tenantId);
    const supplierPaymentsData = useSupplierPayments(tenantId);
    const salaryAdvancesData = useSalaryAdvances(tenantId);
    const attendanceLogsData = useAttendanceLogs(tenantId);
    const assignedChecklistsData = useAssignedChecklists(tenantId);
    const safetyInspectionsData = useSafetyInspections(tenantId);
    const checklistTemplatesData = useChecklistTemplates(tenantId);
    const behaviorObservationsData = useBehaviorObservations(tenantId);
    const stockMovementsData = useStockMovements(tenantId);
    const subscriptionPlansData = useSubscriptionPlans();
    const firebaseWorkItems = useWorkItems(tenantId);
    const progressLogsData = useProgressLogs(tenantId);
    const dynamicRolesData = useRoles();

    // === Efecto para seeding de work items ===
    useEffect(() => {
        const seedWorkItems = async () => {
            if (tenantId && firebaseWorkItems.length === 0 && can('construction_control:edit_structure')) {
                console.log(`Seeding work items for tenant ${tenantId}...`);
                const batch = writeBatch(db);
                WORK_ITEMS_SEED.forEach(item => {
                    const docRef = doc(db, "workItems", item.id);
                    batch.set(docRef, { ...item, tenantId, progress: 0, status: 'in-progress' });
                });
                await batch.commit();
                console.log("Work items seeded successfully.");
            }
        };

        if (tenantId) {
            seedWorkItems().catch(console.error);
        }
    }, [tenantId, firebaseWorkItems.length, can]); // Mejorado: solo depende de length

    // === Efecto principal: carga progresiva de datos ===
    useEffect(() => {
        if (authLoading) {
            dispatch({ type: 'SET_LOADING', payload: true });
            return;
        }

        if (!user) {
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        if (!tenantId) {
            return;
        }

        // Función para convertir Timestamps a Dates
        const processData = (data: any[] | undefined) => {
            if (!Array.isArray(data)) return [];
            return data.map((item) => {
                const newItem = { ...item };
                for (const prop in newItem) {
                    if (newItem[prop] instanceof Timestamp) {
                        (newItem as any)[prop] = newItem[prop].toDate();
                    }
                }
                return newItem;
            });
        };

        // Actualización progresiva: cada colección se guarda cuando llega
        if (usersData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "users", data: processData(usersData) } });
        if (materialsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "materials", data: processData(materialsData) } });
        if (toolsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "tools", data: processData(toolsData) } });
        if (toolLogsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "toolLogs", data: processData(toolLogsData) } });
        if (requestsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "requests", data: processData(requestsData) } });
        if (returnRequestsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "returnRequests", data: processData(returnRequestsData) } });
        if (purchaseRequestsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "purchaseRequests", data: processData(purchaseRequestsData) } });
        if (suppliersData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "suppliers", data: processData(suppliersData) } });
        if (materialCategoriesData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "materialCategories", data: processData(materialCategoriesData) } });
        if (unitsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "units", data: processData(unitsData) } });
        if (purchaseLotsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "purchaseLots", data: processData(purchaseLotsData) } });
        if (purchaseOrdersData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "purchaseOrders", data: processData(purchaseOrdersData) } });
        if (supplierPaymentsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "supplierPayments", data: processData(supplierPaymentsData) } });
        if (salaryAdvancesData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "salaryAdvances", data: processData(salaryAdvancesData) } });
        if (attendanceLogsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "attendanceLogs", data: processData(attendanceLogsData) } });
        if (assignedChecklistsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "assignedChecklists", data: processData(assignedChecklistsData) } });
        if (safetyInspectionsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "safetyInspections", data: processData(safetyInspectionsData) } });
        if (checklistTemplatesData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "checklistTemplates", data: processData(checklistTemplatesData) } });
        if (behaviorObservationsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "behaviorObservations", data: processData(behaviorObservationsData) } });
        if (stockMovementsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "stockMovements", data: processData(stockMovementsData) } });
        if (progressLogsData !== undefined) dispatch({ type: 'SET_DATA', payload: { collection: "progressLogs", data: processData(progressLogsData) } });

        // Work items con fallback
        if (firebaseWorkItems !== undefined) {
            let processed = processData(firebaseWorkItems);
            if (processed.length === 0 && tenantId) {
                processed = WORK_ITEMS_SEED.map(item => ({
                    ...item,
                    tenantId,
                    status: 'in-progress',
                    progress: 0,
                } as WorkItem));
            }
            dispatch({ type: 'SET_DATA', payload: { collection: "workItems", data: processed } });
        }

        // Roles y planes con fallback
        if (dynamicRolesData !== undefined) {
            const rolesToUse = dynamicRolesData && Object.keys(dynamicRolesData).length > 0 ? dynamicRolesData : ROLES_DEFAULT;
            dispatch({ type: "SET_ROLES", payload: rolesToUse });
        }

        if (subscriptionPlansData !== undefined) {
            const plansToUse = subscriptionPlansData && Object.keys(subscriptionPlansData).length > 0 ? subscriptionPlansData : PLANS;
            dispatch({ type: "SET_PLANS", payload: plansToUse });
        }

        // Determinar si todo está cargado → quitar loading global
        const allCollectionsLoaded = [
            usersData, materialsData, toolsData, toolLogsData, requestsData,
            returnRequestsData, purchaseRequestsData, suppliersData, materialCategoriesData,
            unitsData, purchaseLotsData, purchaseOrdersData, supplierPaymentsData,
            salaryAdvancesData, attendanceLogsData, assignedChecklistsData, safetyInspectionsData,
            checklistTemplatesData, behaviorObservationsData, stockMovementsData,
            firebaseWorkItems, progressLogsData, dynamicRolesData, subscriptionPlansData
        ].every(item => item !== undefined);

        dispatch({ type: 'SET_LOADING', payload: !allCollectionsLoaded });

    }, [
        authLoading, user, tenantId,
        usersData, materialsData, toolsData, toolLogsData, requestsData,
        returnRequestsData, purchaseRequestsData, suppliersData, materialCategoriesData,
        unitsData, purchaseLotsData, purchaseOrdersData, supplierPaymentsData,
        salaryAdvancesData, attendanceLogsData, assignedChecklistsData, safetyInspectionsData,
        checklistTemplatesData, behaviorObservationsData, stockMovementsData,
        firebaseWorkItems, progressLogsData, dynamicRolesData, subscriptionPlansData
    ]);

    const notify = useCallback((message: string, variant: "default" | "destructive" | "success" = "default") => {
        toast({
          variant: variant === "success" ? "default" : variant,
          title: variant === "success" ? "Éxito" : variant === "destructive" ? "Error" : "Notificación",
          description: message,
          className: variant === 'success' ? 'border-green-500' : ''
        });
      }, [toast]);
    
    const bindContext = <T extends any[], R>(fn: (...args: [...T, { user: any; tenantId: string | null; db: any }]) => R) => {
        return (...args: T): R => {
            const context = { user, tenantId, db };
            if (context.user === undefined || context.db === undefined) {
                 throw new Error("Context for mutation is not yet available.");
            }
            return fn(...args, context);
        };
    };

    // Tus funciones de mutación (sin cambios)
    const functions = {
      addPurchaseRequest: bindContext(purchaseRequestMutations.addPurchaseRequest),
      updatePurchaseRequestStatus: bindContext(purchaseRequestMutations.updatePurchaseRequestStatus),
      receivePurchaseRequest: bindContext(purchaseRequestMutations.receivePurchaseRequest),
      deletePurchaseRequest: bindContext(purchaseRequestMutations.deletePurchaseRequest),
      cancelPurchaseOrder: bindContext(purchaseRequestMutations.cancelPurchaseOrder),
      archiveLot: bindContext(purchaseRequestMutations.archiveLot),
      generatePurchaseOrder: bindContext(purchaseRequestMutations.generatePurchaseOrder),
      createPurchaseOrder: bindContext(purchaseRequestMutations.createPurchaseOrder),
      returnToPool: bindContext(purchaseRequestMutations.returnToPool),

      addMaterialRequest: bindContext(materialRequestMutations.addMaterialRequest),
      updateMaterialRequestStatus: bindContext(materialRequestMutations.updateMaterialRequestStatus),
      addReturnRequest: bindContext(materialRequestMutations.addReturnRequest),
      updateReturnRequestStatus: bindContext(materialRequestMutations.updateReturnRequestStatus),
      
      addTenant: bindContext(genericMutations.addTenant),
      updateUser: bindContext(genericMutations.updateUser),
      deleteUser: bindContext(genericMutations.deleteUser),
      addMaterial: bindContext(genericMutations.addMaterial),
      updateMaterial: bindContext(genericMutations.updateMaterial),
      deleteMaterial: bindContext(genericMutations.deleteMaterial),
      addManualStockEntry: bindContext(genericMutations.addManualStockEntry),
      addMaterialCategory: bindContext(genericMutations.addMaterialCategory),
      updateMaterialCategory: bindContext(genericMutations.updateMaterialCategory),
      deleteMaterialCategory: bindContext(genericMutations.deleteMaterialCategory),
      addUnit: bindContext(genericMutations.addUnit),
      deleteUnit: bindContext(genericMutations.deleteUnit),
      addSupplier: bindContext(genericMutations.addSupplier),
      updateSupplier: bindContext(genericMutations.updateSupplier),
      deleteSupplier: bindContext(genericMutations.deleteSupplier),
      createLot: bindContext(genericMutations.createLot),
      addRequestToLot: bindContext(genericMutations.addRequestToLot),
      removeRequestFromLot: bindContext(genericMutations.removeRequestFromLot),
      deleteLot: bindContext(genericMutations.deleteLot),

      addTool: bindContext(toolMutations.addTool),
      updateTool: bindContext(toolMutations.updateTool),
      deleteTool: bindContext(toolMutations.deleteTool),
      checkoutTool: bindContext(toolMutations.checkoutTool),
      returnTool: bindContext(toolMutations.returnTool),
      findActiveLogForTool: bindContext(toolMutations.findActiveLogForTool),

      addChecklistTemplate: bindContext(safetyMutations.addChecklistTemplate),
      deleteChecklistTemplate: bindContext(safetyMutations.deleteChecklistTemplate),
      assignChecklistToSupervisors: bindContext(safetyMutations.assignChecklistToSupervisors),
      completeAssignedChecklist: bindContext(safetyMutations.completeAssignedChecklist),
      reviewAssignedChecklist: bindContext(safetyMutations.reviewAssignedChecklist),
      deleteAssignedChecklist: bindContext(safetyMutations.deleteAssignedChecklist),
      addSafetyInspection: bindContext(safetyMutations.addSafetyInspection),
      completeSafetyInspection: bindContext(safetyMutations.completeSafetyInspection),
      reviewSafetyInspection: bindContext(safetyMutations.reviewSafetyInspection),
      addBehaviorObservation: bindContext(safetyMutations.addBehaviorObservation),

      handleAttendanceScan: bindContext(attendanceMutations.handleAttendanceScan),
      addManualAttendance: bindContext(attendanceMutations.addManualAttendance),
      updateAttendanceLog: bindContext(attendanceMutations.updateAttendanceLog),
      deleteAttendanceLog: bindContext(attendanceMutations.deleteAttendanceLog),

      addSupplierPayment: bindContext(paymentMutations.addSupplierPayment),
      updateSupplierPayment: bindContext(paymentMutations.updateSupplierPayment),
      markPaymentAsPaid: bindContext(paymentMutations.markPaymentAsPaid),
      deleteSupplierPayment: bindContext(paymentMutations.deleteSupplierPayment),
      addSalaryAdvanceRequest: bindContext(paymentMutations.addSalaryAdvanceRequest),
      approveSalaryAdvance: bindContext(paymentMutations.approveSalaryAdvance),
      rejectSalaryAdvance: bindContext(paymentMutations.rejectSalaryAdvance),
      
      updateRolePermissions: bindContext(genericMutations.updateRolePermissions),
      updatePlanPermissions: bindContext(genericMutations.updatePlanPermissions),
      
      updateTenant: bindContext(genericMutations.updateTenant),

      addWorkItem: bindContext(genericMutations.addWorkItem),
      updateWorkItem: bindContext(genericMutations.updateWorkItem),
      deleteWorkItem: bindContext(genericMutations.deleteWorkItem),
      addWorkItemProgress: bindContext(genericMutations.addWorkItemProgress),
      submitForQualityReview: bindContext(genericMutations.submitForQualityReview),
      approveWorkItem: bindContext(genericMutations.approveWorkItem),
      rejectWorkItem: bindContext(genericMutations.rejectWorkItem),
    };

    const value: AppStateContextType = {
        ...state,
        isLoading: state.isLoading,
        roles: state.roles,
        subscriptionPlans: state.subscriptionPlans,
        can,
        notify,
        refreshData: () => {},
        ...functions,
    };

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}