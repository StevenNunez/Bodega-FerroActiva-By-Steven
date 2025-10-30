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
  QrCode,
  Undo2,
} from 'lucide-react';

import { useAppState, useAuth } from '@/contexts/app-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { UserRole } from '@/lib/data';
import type { Permission } from '@/lib/permissions';

const allModules: (ModuleCardProps & { permission: Permission })[] = [
    { href: '/dashboard/admin', icon: Warehouse, title: "Módulo de Bodega", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_warehouse:view' },
    { href: '/dashboard/users', icon: UserIcon, title: "Módulo de Usuarios", description: "Gestiona los perfiles y roles de los trabajadores.", permission: 'module_users:view' },
    { href: '/dashboard/subscriptions', icon: DollarSign, title: "Módulo de Suscripciones", description: "Gestiona los inquilinos (clientes) de la plataforma.", permission: 'module_subscriptions:view' },
    { href: '/dashboard/safety', icon: ShieldCheck, title: "Módulo de Prevención", description: "Gestión de checklists, plantillas y revisiones de seguridad.", permission: 'module_safety:view' },
    { href: '/dashboard/attendance', icon: CalendarCheck, title: "Módulo de Asistencia", description: "Control de entrada/salida de personal y reportes.", permission: 'module_attendance:view' },
    { href: '/dashboard/payments', icon: DollarSign, title: "Módulo de Pagos", description: "Gestiona las facturas y pagos a proveedores.", permission: 'module_payments:view' },
    { href: '/dashboard/reports', icon: BarChart3, title: "Módulo de Reportes", description: "Analiza el consumo de materiales y genera informes.", permission: 'module_reports:view' },
    { href: '/dashboard/admin/permissions', icon: ListChecks, title: "Gestión de Permisos", description: "Define y ajusta lo que cada rol puede hacer en la plataforma.", permission: 'module_permissions:view' },
];

const getDashboardHomeForRole = (role: UserRole): string => {
    switch (role) {
        case 'admin':
        case 'bodega-admin':
            return '/dashboard/admin';
        case 'operations':
            return '/dashboard/operations';
        case 'supervisor':
            return '/dashboard/supervisor';
        case 'apr':
            return '/dashboard/apr';
        case 'worker':
             return '/dashboard/worker';
        default:
            return '/dashboard'; // Fallback for finance, etc.
    }
};

interface ModuleCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const warehouseNavItems = (can: (p: any) => boolean, userRole: UserRole | null) => {
    const items = [];
    if (!userRole) return [];
    
    const dashboardHome = getDashboardHomeForRole(userRole);
    
    // General
    if(can('module_warehouse:view')) items.push({ href: dashboardHome, icon: LayoutDashboard, label: 'Resumen' });
    
    // Herramientas
    if (can('tools:create')) items.push({ href: '/dashboard/admin/tools', icon: Wrench, label: 'Herramientas' });
    
    // Materiales
    if (can('materials:create')) items.push({ href: '/dashboard/admin/materials', icon: Package, label: 'Materiales' });
    if (can('stock:add_manual')) items.push({ href: '/dashboard/admin/manual-stock-entry', icon: Edit, label: 'Ingreso Manual' });
    if (can('stock:add_manual')) items.push({ href: '/dashboard/admin/return-requests', icon: Undo2, label: 'Gestionar Devoluciones', notificationKey: 'pendingReturnRequests' });
    
    // Solicitudes
    if (can('material_requests:view_all')) items.push({ href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Solicitudes Materiales', notificationKey: 'pendingMaterialRequests' });
    if (can('purchase_requests:view_all')) items.push({ href: '/dashboard/admin/purchase-requests', icon: ShoppingCart, label: 'Solicitudes Compra' });
    
    // Compras
    if (can('lots:create')) items.push({ href: '/dashboard/operations/lots', icon: PackagePlus, label: 'Gestión de Lotes' });
    if (can('orders:create')) items.push({ href: '/dashboard/operations/orders', icon: FileText, label: 'Órdenes de Compra' });
    
    // Config
    if (can('units:create')) items.push({ href: '/dashboard/admin/units', icon: Ruler, label: 'Unidades' });
    if (can('categories:create')) items.push({ href: '/dashboard/admin/categories', icon: FolderTree, label: 'Categorías' });
    if (can('suppliers:create')) items.push({ href: '/dashboard/admin/suppliers', icon: Briefcase, label: 'Proveedores' });

    // Admin can also create purchase requests
    if (userRole === 'admin' && can('purchase_requests:create')) {
        const purchasePath = `/dashboard/operations/purchase-request-form`;
        if (!items.some(item => item.href === purchasePath)) {
            items.push({ href: purchasePath, icon: ShoppingCart, label: 'Solicitar Compra' });
        }
    }
    
    // Supervisor specific
    if (userRole === 'supervisor' || userRole === 'apr' || userRole === 'operations') {
        if (can('material_requests:create')) {
            const requestPath = `/dashboard/${userRole}/request`;
            if (!items.some(item => item.href === requestPath)) {
                items.push({ href: requestPath, icon: PlusCircle, label: 'Solicitar Materiales' });
            }
            const returnPath = `/dashboard/supervisor/return-request`;
            if (userRole === 'supervisor' && !items.some(item => item.href === returnPath)) {
                 items.push({ href: returnPath, icon: Undo2, label: 'Devolver Material' });
            }
        }
        if (can('purchase_requests:create')) {
             const purchasePath = `/dashboard/${userRole}/purchase-request-form`;
             if (!items.some(item => item.href === purchasePath)) {
                items.push({ href: purchasePath, icon: ShoppingCart, label: 'Solicitar Compra' });
             }
        }
    }

    // Worker specific
    if (can('tools:view_own') && userRole === 'worker') {
        if (!items.some(item => item.href === '/dashboard/worker')) {
            items.push({ href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' });
        }
    }

    // Remove duplicates by href
    const uniqueItems = Array.from(new Map(items.map(item => [item.href, item])).values());
    // Sort logic can be added here if needed, e.g., by label
    return uniqueItems;
}


const usersNavItems = (can: (p: any) => boolean) => {
    const items = [];
    if(can('users:view')) {
      items.push({ href: '/dashboard/users', icon: Users, label: 'Lista de Usuarios' });
    }
    if(can('users:create')) { // Assuming printing QRs requires creation permission
       items.push({ href: '/dashboard/users/print-qrs', icon: QrCode, label: 'Imprimir Credenciales' });
    }
    return items;
};

const attendanceNavItems = [
    { href: '/dashboard/attendance/registry', icon: CalendarCheck, label: 'Registro de Asistencia' },
    { href: '/dashboard/attendance/report', icon: BookOpen, label: 'Reporte Semanal' },
    { href: '/dashboard/attendance/monthly-report', icon: FileBarChart, label: 'Reporte Mensual' },
    { href: '/dashboard/attendance/overtime', icon: Clock, label: 'Horas Extras' },
];

const paymentsNavItems = (can: (p:any) => boolean) => {
    const items = [];
    if (can('payments:view')) items.push({ href: '/dashboard/payments', icon: LayoutDashboard, label: 'Resumen de Pagos', notificationKey: 'paymentNotifications' });
    if (can('payments:create')) items.push({ href: '/dashboard/payments/pago-facturas', icon: DollarSign, label: 'Pago Facturas' });
    if (can('suppliers:view')) items.push({ href: '/dashboard/payments/suppliers', icon: Briefcase, label: 'Proveedores' });
    return items;
};

const reportsNavItems = [
    { href: '/dashboard/reports/stats', icon: BarChart3, label: 'Estadísticas de Consumo' },
    { href: '/dashboard/reports/deliveries', icon: FileBarChart, label: 'Reporte de Entregas' },
];

const subscriptionsNavItems = [
    { href: '/dashboard/subscriptions', icon: Users, label: 'Gestión de Inquilinos' },
];

const permissionsNavItems = [
    { href: '/dashboard/admin/permissions', icon: ListChecks, label: 'Gestión de Permisos' },
];

const safetyNavItems = (can: (p: any) => boolean) => {
    const items = [];
    if (can('safety_inspections:create')) items.push({ href: '/dashboard/safety/inspection', icon: ShieldAlert, label: 'Nueva Inspección'});
    if (can('safety_observations:create')) items.push({ href: '/dashboard/safety/behavior-observation', icon: ClipboardPaste, label: 'Nueva Observación' });

    if (can('safety_templates:create')) {
        items.push({ href: '/dashboard/safety/templates', icon: FileUp, label: 'Gestión de Plantillas'});
    }
     if (can('safety_checklists:review')) {
        items.push({ href: '/dashboard/safety/review-checklists', icon: ShieldCheck, label: 'Revisar Checklists'});
     }
      if (can('safety_inspections:review')) {
        items.push({ href: '/dashboard/safety/review-inspections', icon: ShieldCheck, label: 'Revisar Inspecciones' });
        items.push({ href: '/dashboard/safety/review-observations', icon: ShieldCheck, label: 'Revisar Observaciones' });
      }
    if (can('safety_checklists:complete')) {
         items.push({ href: '/dashboard/safety/assigned-checklists', icon: ListChecks, label: 'Mis Checklists' });
    }
     if (can('safety_inspections:complete')) {
        items.push({ href: '/dashboard/safety/assigned-inspections', icon: ShieldCheck, label: 'Mis Inspecciones' });
    }
    // Add summary last if there are other items
    if(items.length > 0) {
      items.unshift({ href: '/dashboard/safety', icon: LayoutDashboard, label: 'Resumen' });
    }
    return items;
};


interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { requests, purchaseRequests, supplierPayments, returnRequests, can } = useAppState();
  
  const today = startOfDay(new Date());

  const paymentNotifications = React.useMemo(() => {
    return (supplierPayments || []).filter(p => {
        if (p.status === 'paid') return false;
        const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
        const daysLeft = differenceInDays(dueDate, today);
        return daysLeft <= 7; // Overdue or due within 7 days
    }).length;
  }, [supplierPayments, today]);


  const pendingMaterialRequests = React.useMemo(() => (requests || []).filter(r => r.status === 'pending').length, [requests]);
  const pendingReturnRequests = React.useMemo(() => (returnRequests || []).filter(r => r.status === 'pending').length, [returnRequests]);
  const pendingPurchaseRequests = React.useMemo(() => (purchaseRequests || []).filter(pr => pr.status === 'pending').length, [purchaseRequests]);
  
  const notificationCounts = {
    pendingMaterialRequests,
    pendingReturnRequests,
    pendingPurchaseRequests,
    paymentNotifications,
  };

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  }
  
  const { currentNavItems, moduleTitle, isSubModule } = React.useMemo(() => {
    if (!user) return { currentNavItems: [], moduleTitle: '', isSubModule: false };

    let navItems: { href: string; icon: React.ElementType; label: string; notificationKey?: string; description?: string; permission?: Permission }[] = [];
    let title = '';

    const warehousePaths = ['/dashboard/admin', '/dashboard/operations', '/dashboard/supervisor', '/dashboard/worker', '/dashboard/profile'];
    const isDefaultWarehouseView = warehousePaths.some(p => pathname.startsWith(p));
    
    if (pathname.startsWith('/dashboard/users')) {
        navItems = usersNavItems(can);
        title = 'Módulo de Usuarios';
    } else if (pathname.startsWith('/dashboard/admin/permissions')) {
        navItems = permissionsNavItems;
        title = 'Módulo de Permisos';
    } else if (pathname.startsWith('/dashboard/attendance')) {
        navItems = attendanceNavItems;
        title = 'Módulo de Asistencia';
    } else if (pathname.startsWith('/dashboard/safety')) {
        navItems = safetyNavItems(can);
        title = 'Prevención de Riesgos';
    } else if (pathname.startsWith('/dashboard/payments')) {
        navItems = paymentsNavItems(can);
        title = 'Módulo de Pagos';
    } else if (pathname.startsWith('/dashboard/reports')) {
        navItems = reportsNavItems;
        title = 'Estadísticas y Reportes';
    } else if (pathname.startsWith('/dashboard/subscriptions')) {
        navItems = subscriptionsNavItems;
        title = 'Módulo de Suscripciones';
    } else if (isDefaultWarehouseView) {
        navItems = warehouseNavItems(can, user.role);
        title = 'Módulo Bodega';
    } else { // This is the main dashboard hub
        navItems = allModules.filter(module => can(module.permission));
        title = 'Portal de Módulos';
    }
    
    return { currentNavItems: navItems, moduleTitle: title, isSubModule: pathname !== '/dashboard' };

  }, [pathname, user, can]);

  return (
    <>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={handleLinkClick}>
             {isSubModule ? <ArrowLeft className="h-6 w-6 text-primary" /> : <Warehouse className="h-6 w-6 text-primary" />}
            <span className="">{moduleTitle}</span>
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
      </div>
    </>
  );
}
