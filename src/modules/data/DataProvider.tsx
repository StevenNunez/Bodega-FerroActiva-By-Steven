
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
} from '@/modules/core/lib/data';
import {
  ROLES as ROLES_DEFAULT,
  Permission,
  PLANS,
} from '@/modules/core/lib/permissions';

import { useAuth } from "@/modules/auth/useAuth";
import { useToast } from "@/modules/core/hooks/use-toast";
import {
  useMaterials,
  useTools,
  usePurchaseRequests,
  useUsers,
  useRoles,
  useToolLogs,
  useMaterialRequests,
  useReturnRequests,
  useSuppliers,
  useMaterialCategories,
  useUnits,
  usePurchaseLots,
  usePurchaseOrders,
  useSupplierPayments,
  useAttendanceLogs,
  useAssignedChecklists,
  useSafetyInspections,
  useChecklistTemplates,
  useBehaviorObservations,
  useStockMovements,
  useSubscriptionPlans,
} from "./collections";
import { AppDataState, AppStateAction, AppStateContextType } from './types';
import * as materialRequestMutations from './mutations/materialRequestMutations';
import * as purchaseRequestMutations from './mutations/purchaseRequestMutations';
import * as genericMutations from './mutations/genericMutations';
import * as toolMutations from './mutations/toolMutations';
import * as safetyMutations from './mutations/safetyMutations';
import * as attendanceMutations from './mutations/attendanceMutations';
import * as paymentMutations from './mutations/paymentMutations';

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
    attendanceLogs: [],
    assignedChecklists: [],
    safetyInspections: [],
    checklistTemplates: [],
    behaviorObservations: [],
    stockMovements: [],
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

// --- Context Definition ---

export const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user, getTenantId, subscription } = useAuth();
    const [state, dispatch] = useReducer(appReducer, initialState);
    const { toast } = useToast();

    const tenantId = getTenantId();

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
    const attendanceLogsData = useAttendanceLogs(tenantId);
    const assignedChecklistsData = useAssignedChecklists(tenantId);
    const safetyInspectionsData = useSafetyInspections(tenantId);
    const checklistTemplatesData = useChecklistTemplates(tenantId);
    const behaviorObservationsData = useBehaviorObservations(tenantId);
    const rolesData = useRoles();
    const stockMovementsData = useStockMovements(tenantId);
    const subscriptionPlansData = useSubscriptionPlans();

    useEffect(() => {
        if (!user) return;
    
        dispatch({ type: "SET_LOADING", payload: true });
    
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
    
        dispatch({ type: 'SET_DATA', payload: { collection: "users", data: processData(usersData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "materials", data: processData(materialsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "tools", data: processData(toolsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "toolLogs", data: processData(toolLogsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "requests", data: processData(requestsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "returnRequests", data: processData(returnRequestsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "purchaseRequests", data: processData(purchaseRequestsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "suppliers", data: processData(suppliersData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "materialCategories", data: processData(materialCategoriesData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "units", data: processData(unitsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "purchaseLots", data: processData(purchaseLotsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "purchaseOrders", data: processData(purchaseOrdersData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "supplierPayments", data: processData(supplierPaymentsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "attendanceLogs", data: processData(attendanceLogsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "assignedChecklists", data: processData(assignedChecklistsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "safetyInspections", data: processData(safetyInspectionsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "checklistTemplates", data: processData(checklistTemplatesData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "behaviorObservations", data: processData(behaviorObservationsData) } });
        dispatch({ type: 'SET_DATA', payload: { collection: "stockMovements", data: processData(stockMovementsData) } });

        const rolesToUse = rolesData && Object.keys(rolesData).length > 0 ? rolesData : ROLES_DEFAULT;
        dispatch({ type: "SET_ROLES", payload: rolesToUse });

        const plansToUse = subscriptionPlansData && Object.keys(subscriptionPlansData).length > 0 ? subscriptionPlansData : PLANS;
        dispatch({ type: "SET_PLANS", payload: plansToUse });
    
        dispatch({ type: "SET_LOADING", payload: false });
    
    }, [
        user, usersData, materialsData, toolsData, toolLogsData, requestsData,
        returnRequestsData, purchaseRequestsData, suppliersData, materialCategoriesData,
        unitsData, purchaseLotsData, purchaseOrdersData, supplierPaymentsData,
        attendanceLogsData, assignedChecklistsData, safetyInspectionsData,
        checklistTemplatesData, behaviorObservationsData, rolesData, stockMovementsData,
        subscriptionPlansData
    ]);

    const can = useCallback((permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === 'super-admin' || user.role === 'admin' || user.role === 'operations') return true;
    
      const userRolePermissions = state.roles[user.role]?.permissions || [];
    
      const currentPlanName = subscription?.plan || 'professional';
      const currentPlan = PLANS[currentPlanName as keyof typeof PLANS] || PLANS.professional;
      
      if (!currentPlan) return false;

      const planAllowedRoles = currentPlan.allowedRoles;
    
      if (!planAllowedRoles.includes(user.role)) return false;
    
      return userRolePermissions.includes(permission);
    }, [user, state.roles, subscription]);

    const notify = useCallback((message: string, variant: "default" | "destructive" | "success" = "default") => {
        toast({
          variant: variant === "success" ? "default" : variant,
          title: variant === "success" ? "Éxito" : variant === "destructive" ? "Error" : "Notificación",
          description: message,
          className: variant === 'success' ? 'border-green-500' : ''
        });
      }, [toast]);
    
    // Bind context to all mutation functions
    const bindContext = <T extends any[], R>(fn: (...args: [...T, { user: any; tenantId: string | null; db: any }]) => R) => {
        return (...args: T): R => {
            const context = { user, tenantId, db };
            // Ensure context properties are not undefined before calling
            if (context.user === undefined || context.db === undefined) {
                 throw new Error("Context for mutation is not yet available.");
            }
            return fn(...args, context);
        };
    };

    const functions = {
      // Purchase Requests
      addPurchaseRequest: bindContext(purchaseRequestMutations.addPurchaseRequest),
      updatePurchaseRequestStatus: bindContext(purchaseRequestMutations.updatePurchaseRequestStatus),
      receivePurchaseRequest: bindContext(purchaseRequestMutations.receivePurchaseRequest),
      deletePurchaseRequest: bindContext(purchaseRequestMutations.deletePurchaseRequest),
      cancelPurchaseOrder: bindContext(purchaseRequestMutations.cancelPurchaseOrder),
      archiveLot: bindContext(purchaseRequestMutations.archiveLot),

      // Material Requests
      addMaterialRequest: bindContext(materialRequestMutations.addMaterialRequest),
      updateMaterialRequestStatus: bindContext(materialRequestMutations.updateMaterialRequestStatus),
      addReturnRequest: bindContext(materialRequestMutations.addReturnRequest),
      updateReturnRequestStatus: bindContext(materialRequestMutations.updateReturnRequestStatus),
      
      // Generic CRUD
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

      // Tools
      addTool: bindContext(toolMutations.addTool),
      updateTool: bindContext(toolMutations.updateTool),
      deleteTool: bindContext(toolMutations.deleteTool),
      checkoutTool: bindContext(toolMutations.checkoutTool),
      returnTool: bindContext(toolMutations.returnTool),
      findActiveLogForTool: bindContext(toolMutations.findActiveLogForTool),

      // Safety
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

      // Attendance
      handleAttendanceScan: bindContext(attendanceMutations.handleAttendanceScan),
      addManualAttendance: bindContext(attendanceMutations.addManualAttendance),
      updateAttendanceLog: bindContext(attendanceMutations.updateAttendanceLog),
      deleteAttendanceLog: bindContext(attendanceMutations.deleteAttendanceLog),

      // Payments
      addSupplierPayment: bindContext(paymentMutations.addSupplierPayment),
      updateSupplierPayment: bindContext(paymentMutations.updateSupplierPayment),
      markPaymentAsPaid: bindContext(paymentMutations.markPaymentAsPaid),
      deleteSupplierPayment: bindContext(paymentMutations.deleteSupplierPayment),
      
      // Permissions
      updateRolePermissions: bindContext(genericMutations.updateRolePermissions),
      updatePlanPermissions: bindContext(genericMutations.updatePlanPermissions),
      
      // Purchase Orders
      generatePurchaseOrder: bindContext(purchaseRequestMutations.generatePurchaseOrder),

      // Tenant
      updateTenant: bindContext(genericMutations.updateTenant),
    };

    const value: AppStateContextType = {
        ...state,
        isLoading: state.isLoading,
        roles: state.roles,
        subscriptionPlans: state.subscriptionPlans,
        can,
        notify,
        ...functions,
    };

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
