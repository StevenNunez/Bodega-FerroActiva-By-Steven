
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  ClipboardList,
  LogOut,
  Warehouse,
  Package,
  PlusCircle,
  ShoppingCart,
  Briefcase,
  PackagePlus,
  FileText,
  Medal,
  Upload,
  FolderTree,
  Edit,
  CalendarCheck,
  Clock,
  BookOpen,
  FileBarChart,
  User as UserIcon,
  Ruler,
  ShieldCheck,
  FileUp,
  ArrowLeft,
  ListChecks,
  DollarSign,
  ShieldAlert,
  ClipboardPaste,
  BarChart3,
} from 'lucide-react';

import { useAppState, useAuth } from '@/contexts/app-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// --- Main Navigation Definitions ---
const adminNavItems = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/admin/tools', icon: Wrench, label: 'Herramientas' },
  { href: '/dashboard/admin/materials', icon: Package, label: 'Materiales' },
  { href: '/dashboard/admin/manual-stock-entry', icon: Edit, label: 'Ingreso Manual' },
  { href: '/dashboard/admin/units', icon: Ruler, label: 'Unidades' },
  { href: '/dashboard/admin/categories', icon: FolderTree, label: 'Categorías' },
  { href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Solicitudes de Materiales', notificationKey: 'pendingMaterialRequests' },
  { href: '/dashboard/admin/purchase-requests', icon: ShoppingCart, label: 'Solicitudes de Compra' },
  { href: '/dashboard/admin/purchase-request-form', icon: ShoppingCart, label: 'Solicitar Compra' },
  { href: '/dashboard/admin/suppliers', icon: Briefcase, label: 'Proveedores' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Usuarios' },
];

const supervisorNavItems = [
  { href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/supervisor/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/supervisor/purchase-request', icon: ShoppingCart, label: 'Solicitar Compra' },
  { href: '/dashboard/supervisor/suppliers', icon: Briefcase, label: 'Proveedores' },
  { href: '/dashboard/supervisor/categories', icon: FolderTree, label: 'Categorías' },
];

const aprNavItems = [
  { href: '/dashboard/apr', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/apr/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/apr/purchase-request', icon: ShoppingCart, label: 'Solicitar Compra' },
  { href: '/dashboard/reports/deliveries', icon: FileBarChart, label: 'Reporte de Entregas' },
];

const workerNavItems = [
  { href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' },
];

const operationsNavItems = [
    { href: '/dashboard/operations', icon: Briefcase, label: 'Gestión de Compras', notificationKey: 'pendingPurchaseRequests' },
    { href: '/dashboard/operations/request', icon: PlusCircle, label: 'Solicitar Materiales' },
    { href: '/dashboard/operations/purchase-request-form', icon: ShoppingCart, label: 'Solicitar Compra' },
    { href: '/dashboard/operations/lots', icon: PackagePlus, label: 'Gestión de Lotes' },
    { href: '/dashboard/operations/units', icon: Ruler, label: 'Unidades' },
    { href: '/dashboard/operations/categories', icon: FolderTree, label: 'Categorías' },
    { href: '/dashboard/operations/orders', icon: FileText, label: 'Órdenes de Compra' },
    { href: '/dashboard/operations/suppliers', icon: Briefcase, label: 'Proveedores' },
];

const financeNavItems = [
  // This role only sees the Payments module from the main hub
];

const superAdminNavItems = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Admin Resumen' },
  { href: '/dashboard/operations', icon: Briefcase, label: 'Admin Obra Resumen' },
  { href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Supervisor Resumen' },
  { href: '/dashboard/apr', icon: LayoutDashboard, label: 'APR Resumen' },
  { href: '/dashboard/worker', icon: Wrench, label: 'Colaborador Panel' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Gestión de Usuarios' },
  { href: '/dashboard/admin/tools', icon: Wrench, label: 'Gestión de Herramientas' },
  { href: '/dashboard/admin/materials', icon: Package, label: 'Gestión de Materiales' },
  { href: '/dashboard/operations/lots', icon: PackagePlus, label: 'Gestión de Lotes' },
  { href: '/dashboard/operations/orders', icon: FileText, label: 'Gestión de Órdenes' },
  { href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Solicitudes Materiales' },
  { href: '/dashboard/admin/purchase-requests', icon: ShoppingCart, label: 'Solicitudes Compra' },
];


const mainNavItemsByRole = {
  admin: adminNavItems,
  supervisor: supervisorNavItems,
  worker: workerNavItems,
  operations: operationsNavItems,
  apr: aprNavItems,
  finance: financeNavItems,
  'super-admin': superAdminNavItems, 
  guardia: [{ href: '/dashboard/attendance/registry', icon: CalendarCheck, label: 'Registro de Asistencia' }], 
};

// --- Sub-Module Navigation Definitions ---
const attendanceNavItems = [
    { href: '/dashboard/attendance/registry', icon: CalendarCheck, label: 'Registro de Asistencia' },
    { href: '/dashboard/attendance/report', icon: BookOpen, label: 'Reporte Semanal' },
    { href: '/dashboard/attendance/monthly-report', icon: FileBarChart, label: 'Reporte Mensual' },
    { href: '/dashboard/attendance/overtime', icon: Clock, label: 'Horas Extras' },
];

const paymentsNavItems = [
    { href: '/dashboard/payments', icon: LayoutDashboard, label: 'Resumen de Pagos', notificationKey: 'paymentNotifications' },
    { href: '/dashboard/payments/pago-facturas', icon: DollarSign, label: 'Pago Facturas' },
    { href: '/dashboard/payments/suppliers', icon: Briefcase, label: 'Proveedores' },
];

const reportsNavItems = [
    { href: '/dashboard/reports/stats', icon: BarChart3, label: 'Estadísticas de Consumo' },
    { href: '/dashboard/reports/deliveries', icon: FileBarChart, label: 'Reporte de Entregas' },
];

const subscriptionsNavItems = [
    { href: '/dashboard/subscriptions', icon: Users, label: 'Gestión de Inquilinos' },
];

const safetyNavItems = (role: string) => {
    const items = [
        { href: '/dashboard/safety', icon: LayoutDashboard, label: 'Resumen' }
    ];
    
    if (['apr', 'admin', 'operations', 'super-admin'].includes(role)) {
        items.push({ href: '/dashboard/safety/inspection', icon: ShieldAlert, label: 'Inspección de Seguridad'});
        items.push({ href: '/dashboard/safety/behavior-observation', icon: ClipboardPaste, label: 'Observación de Conducta' });
    }

    if (role === 'apr' || role === 'admin' || role === 'super-admin') {
        items.push({ href: '/dashboard/safety/templates', icon: FileUp, label: 'Gestión de Plantillas'});
        items.push({ href: '/dashboard/safety/review-checklists', icon: ShieldCheck, label: 'Revisar Checklists'});
        items.push({ href: '/dashboard/safety/review-inspections', icon: ShieldCheck, label: 'Revisar Inspecciones' });
        items.push({ href: '/dashboard/safety/review-observations', icon: ShieldCheck, label: 'Revisar Observaciones' });
    }
    if (['admin', 'supervisor', 'operations', 'apr', 'super-admin'].includes(role)) {
         items.push({ href: '/dashboard/safety/assigned-checklists', icon: ListChecks, label: 'Mis Checklists' });
         items.push({ href: '/dashboard/safety/assigned-inspections', icon: ShieldCheck, label: 'Mis Inspecciones' });
    }
    return items;
};


interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { requests, purchaseRequests, supplierPayments } = useAppState();
  
  const today = startOfDay(new Date());

  const paymentNotifications = React.useMemo(() => {
    return supplierPayments.filter(p => {
        if (p.status === 'paid') return false;
        const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
        const daysLeft = differenceInDays(dueDate, today);
        return daysLeft <= 7; // Overdue or due within 7 days
    }).length;
  }, [supplierPayments, today]);


  const pendingMaterialRequests = React.useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);
  const pendingPurchaseRequests = React.useMemo(() => purchaseRequests.filter(pr => pr.status === 'pending').length, [purchaseRequests]);
  
  const notificationCounts = {
    pendingMaterialRequests,
    pendingPurchaseRequests,
    paymentNotifications,
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Jefe de Bodega';
      case 'supervisor': return 'Supervisor';
      case 'worker': return 'Colaborador';
      case 'operations': return 'Administrador de Obra';
      case 'apr': return 'APR';
      case 'guardia': return 'Guardia';
      case 'finance': return 'Jefe de Adm. y Finanzas';
      case 'super-admin': return 'Super Administrador';
      default: return 'Usuario';
    }
  }

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  }
  
  const { currentNavItems, isSubModule, moduleTitle } = React.useMemo(() => {
    if (!user) return { currentNavItems: [], isSubModule: false, moduleTitle: '' };

    const roleNav = mainNavItemsByRole[user.role as keyof typeof mainNavItemsByRole] || [];
    
    if (pathname.startsWith('/dashboard/attendance')) {
        return { currentNavItems: attendanceNavItems, isSubModule: true, moduleTitle: 'Módulo de Asistencia' };
    }
    if (pathname.startsWith('/dashboard/safety')) {
        return { currentNavItems: safetyNavItems(user.role), isSubModule: true, moduleTitle: 'Prevención de Riesgos' };
    }
     if (pathname.startsWith('/dashboard/payments')) {
        return { currentNavItems: paymentsNavItems, isSubModule: true, moduleTitle: 'Módulo de Pagos' };
    }
     if (pathname.startsWith('/dashboard/reports')) {
        return { currentNavItems: reportsNavItems, isSubModule: true, moduleTitle: 'Estadísticas y Reportes' };
    }
    if (pathname.startsWith('/dashboard/subscriptions')) {
        return { currentNavItems: subscriptionsNavItems, isSubModule: true, moduleTitle: 'Módulo de Suscripciones' };
    }
    
    return { currentNavItems: roleNav, isSubModule: false, moduleTitle: '' };

  }, [pathname, user]);
  

  return (
    <>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={handleLinkClick}>
             {isSubModule ? <ArrowLeft className="h-6 w-6 text-primary" /> : <Warehouse className="h-6 w-6 text-primary" />}
            <span className="">{isSubModule ? moduleTitle : "Portal de Módulos"}</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {currentNavItems.map(item => {
              const notifCount = item.notificationKey ? notificationCounts[item.notificationKey as keyof typeof notificationCounts] : 0;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                     { 'bg-primary/10 text-primary': isActive }
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {notifCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                      {notifCount}
                    </span>
                  )}
                </Link>
            )})}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
           <div className='p-2 mb-2 rounded-lg bg-muted'>
              <p className='text-sm font-semibold'>{user?.name}</p>
              <p className='text-xs text-muted-foreground'>{user ? getRoleDisplayName(user.role) : ''}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  );
}
