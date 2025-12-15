"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from 'react';
import { useRouter } from 'next/navigation';
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

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenantId, _setCurrentTenantId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionPlan | null>(null);
  const router = useRouter();

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === 'super-admin' || user.role === 'admin' || user.role === 'operations') return true;
      const userPermissions = ROLES_DEFAULT[user.role]?.permissions;
      return !!userPermissions?.includes(permission);
    },
    [user]
  );
  
  const setCurrentTenantId = (tenantId: string | null) => {
    _setCurrentTenantId(tenantId);
    if (user?.role === 'super-admin') {
        if (tenantId) {
            localStorage.setItem("selectedTenantId", tenantId);
        } else {
            localStorage.removeItem("selectedTenantId");
        }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setUser(userData);
          if (userData.role !== 'super-admin') {
            _setCurrentTenantId(userData.tenantId);
          } else {
            const savedTenantId = localStorage.getItem('selectedTenantId');
            _setCurrentTenantId(savedTenantId);
          }
        } else {
          await signOut(auth);
          setUser(null);
          _setCurrentTenantId(null);
        }
      } else {
        setUser(null);
        _setCurrentTenantId(null);
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
          const fetchedTenants = snapshot.docs.map(
            (doc) => convertTimestamps({ ...doc.data(), id: doc.id }) as Tenant
          );
          setTenants(fetchedTenants);
          
          const saved = localStorage.getItem("selectedTenantId");
          if (saved && fetchedTenants.some(t => t.tenantId === saved)) {
            _setCurrentTenantId(saved);
          } else {
            _setCurrentTenantId(null);
          }

        },
        (error) => console.error('Error fetching tenants:', error)
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
    } else if (user?.role === 'super-admin'){
      setSubscription(PLANS.enterprise as SubscriptionPlan); 
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
      localStorage.removeItem("selectedTenantId");
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
    // You should also update the email in your Firestore 'users' collection
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
    firebaseUser,
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