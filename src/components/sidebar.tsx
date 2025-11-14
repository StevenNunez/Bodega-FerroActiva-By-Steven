'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  ClipboardList,
  Warehouse,
  Package,
  PlusCircle,
  ShoppingCart,
  Briefcase,
  PackagePlus,
  FileText,
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
  FolderTree, 
  HandCoins,
} from 'lucide-react';

import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { cn } from '@/lib/utils';
import { UserRole } from '@/modules/core/lib/data';
import type { Permission } from '@/modules/core/lib/permissions';

const allModules: (ModuleCardProps & { permission: Permission, path: string })[] = [
    { href: '/dashboard/admin', path: '/dashboard/admin', icon: Warehouse, title: "Módulo de Bodega", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_warehouse:view' },
    { href: '/dashboard/purchasing', path: '/dashboard/purchasing', icon: ShoppingCart, title: "Módulo de Compras", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_purchasing:view' },
    { href: '/dashboard/supervisor', path: '/dashboard/supervisor', icon: Warehouse, title: "Módulo de Terreno", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_warehouse:view' },
    { href: '/dashboard/worker', path: '/dashboard/worker', icon: Warehouse, title: "Módulo de Bodega", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_warehouse:view' },
    { href: '/dashboard/users', path: '/dashboard/users', icon: UserIcon, title: "Módulo de Usuarios", description: "Gestiona los perfiles y roles de los trabajadores.", permission: 'module_users:view' },
    { href: '/dashboard/subscriptions', path: '/dashboard/subscriptions', icon: DollarSign, title: "Módulo de Suscripciones", description: "Gestiona los inquilinos (clientes) de la plataforma.", permission: 'module_subscriptions:view' },
    { href: '/dashboard/safety', path: '/dashboard/safety', icon: ShieldCheck, title: "Módulo de Prevención", description: "Gestión de checklists, plantillas y revisiones de seguridad.", permission: 'module_safety:view' },
    { href: '/dashboard/attendance', path: '/dashboard/attendance', icon: CalendarCheck, title: "Módulo de Asistencia", description: "Control de entrada/salida de personal y reportes.", permission: 'module_attendance:view' },
    { href: '/dashboard/payments', path: '/dashboard/payments', icon: DollarSign, title: "Módulo de Pagos", description: "Gestiona las facturas y pagos a proveedores.", permission: 'module_payments:view' },
    { href: '/dashboard/reports', path: '/dashboard/reports', icon: BarChart3, title: "Módulo de Reportes", description: "Analiza el consumo de materiales y genera informes.", permission: 'module_reports:view' },
    { href: '/dashboard/admin/permissions', path: '/dashboard/admin/permissions', icon: ListChecks, title: "Gestión de Permisos", description: "Define y ajusta lo que cada rol puede hacer en la plataforma.", permission: 'module_permissions:view' },
];

const getDashboardHomeForRole = (role: UserRole): string => {
    switch (role) {
        case 'admin':
        case 'bodega-admin':
            return '/dashboard/admin';
        case 'operations':
            return '/dashboard/purchasing';
        case 'supervisor':
        case 'apr':
            return '/dashboard/supervisor';
        case 'cphs':
            return '/dashboard/safety';
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

const warehouseNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    
    if (can('module_warehouse:view')) items.push({ href: '/dashboard/admin', icon: LayoutDashboard, label: 'Resumen Bodega' });
    if (can('material_requests:approve')) items.push({ href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Gestionar Solicitudes' });
    if (can('return_requests:approve')) items.push({ href: '/dashboard/admin/return-requests', icon: Undo2, label: 'Gestionar Devoluciones' });
    if (can('tools:view_all')) items.push({ href: '/dashboard/admin/tools', icon: Wrench, label: 'Herramientas' });
    if (can('materials:view_all')) items.push({ href: '/dashboard/admin/materials', icon: Package, label: 'Materiales' });
    if (can('stock:add_manual')) items.push({ href: '/dashboard/admin/manual-stock-entry', icon: Edit, label: 'Ingreso Manual' });
    if (can('purchase_requests:view_all')) items.push({ href: '/dashboard/admin/purchase-request-form', icon: ShoppingCart, label: 'Visualizar Compras' });
    if (can('units:create')) items.push({ href: '/dashboard/admin/units', icon: Ruler, label: 'Unidades' });
    if (can('categories:create')) items.push({ href: '/dashboard/admin/categories', icon: FolderTree, label: 'Categorías' });
    
    return items;
}

const supervisorNavItems = (can: (p: Permission) => boolean) => {
    const items = [];

    if(can('module_warehouse:view')) items.push({ href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Resumen Supervisor' });
    if (can('tools:view_own')) items.push({ href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' });
    if (can('material_requests:create')) items.push({ href: '/dashboard/supervisor/request', icon: PlusCircle, label: 'Solicitar Materiales' });
    if (can('purchase_requests:create')) items.push({ href: '/dashboard/supervisor/purchase-request-form', icon: ShoppingCart, label: 'Solicitar Compra' });
    if (can('return_requests:create')) items.push({ href: '/dashboard/supervisor/return-request', icon: Undo2, label: 'Registrar Devolución' });
    
    return items;
};

const workerNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('tools:view_own')) {
        items.push({ href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' });
    }
    return items;
}

const purchasingNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_purchasing:view')) items.push({ href: '/dashboard/purchasing', icon: LayoutDashboard, label: 'Resumen' });
    if (can('purchase_requests:create')) items.push({ href: '/dashboard/purchasing/purchase-request-form', icon: Edit, label: 'Crear Solicitud Compra' });
    if (can('purchase_requests:view_all')) items.push({ href: '/dashboard/purchasing/purchase-requests', icon: ShoppingCart, label: 'Solicitudes de Compra' });
    if (can('lots:create')) items.push({ href: '/dashboard/purchasing/lots', icon: PackagePlus, label: 'Gestión de Lotes' });
    if (can('orders:create')) items.push({ href: '/dashboard/purchasing/orders', icon: FileText, label: 'Generador de Cotizaciones' });
    if (can('suppliers:view')) items.push({ href: '/dashboard/purchasing/suppliers', icon: Briefcase, label: 'Proveedores' });
    if (can('categories:view')) items.push({ href: '/dashboard/purchasing/categories', icon: FolderTree, label: 'Categorías' });

    return items;
};

const usersNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('users:view')) {
      items.push({ href: '/dashboard/users', icon: Users, label: 'Lista de Usuarios' });
    }
    if(can('users:print_qr')) {
       items.push({ href: '/dashboard/users/print-qrs', icon: QrCode, label: 'Imprimir Credenciales' });
    }
    return items;
};

const attendanceNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_attendance:view')) items.push({ href: '/dashboard/attendance', icon: LayoutDashboard, label: 'Resumen' });
    if (can('attendance:register')) items.push({ href: '/dashboard/attendance/registry', icon: CalendarCheck, label: 'Registro de Asistencia' });
    if (can('attendance:edit')) {
        items.push({ href: '/dashboard/attendance/report', icon: BookOpen, label: 'Reporte Semanal' });
        items.push({ href: '/dashboard/attendance/monthly-report', icon: FileBarChart, label: 'Reporte Mensual' });
        items.push({ href: '/dashboard/attendance/overtime', icon: Clock, label: 'Horas Extras' });
        items.push({ href: '/dashboard/attendance/severance', icon: HandCoins, label: 'Generador de Finiquito' });
    }
    return items;
};

const paymentsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('payments:view')) items.push({ href: '/dashboard/payments', icon: LayoutDashboard, label: 'Resumen de Pagos' });
    if (can('payments:create')) items.push({ href: '/dashboard/payments/pago-facturas', icon: DollarSign, label: 'Ingresar Facturas' });
    if (can('suppliers:view') && can('module_payments:view')) items.push({ href: '/dashboard/payments/suppliers', icon: Briefcase, label: 'Proveedores' });
    return items;
};

const reportsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('reports:view')) {
        items.push({ href: '/dashboard/reports', icon: LayoutDashboard, label: 'Resumen' });
        items.push({ href: '/dashboard/reports/stats', icon: BarChart3, label: 'Estadísticas de Consumo' });
        items.push({ href: '/dashboard/reports/deliveries', icon: FileBarChart, label: 'Reporte de Entregas' });
    }
    return items;
};

const subscriptionsNavItems = [
    { href: '/dashboard/subscriptions', icon: Users, label: 'Gestión de Inquilinos' },
];

const permissionsNavItems = [
    { href: '/dashboard/admin/permissions', icon: ListChecks, label: 'Gestión de Permisos' },
];

const safetyNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('module_safety:view')) items.push({ href: '/dashboard/safety', icon: LayoutDashboard, label: 'Resumen' });
    
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
      }
      if (can('safety_observations:review')) {
        items.push({ href: '/dashboard/safety/review-observations', icon: ShieldCheck, label: 'Revisar Observaciones' });
      }
    if (can('safety_checklists:complete')) {
         items.push({ href: '/dashboard/safety/assigned-checklists', icon: ListChecks, label: 'Mis Checklists' });
    }
     if (can('safety_inspections:complete')) {
        items.push({ href: '/dashboard/safety/assigned-inspections', icon: ShieldCheck, label: 'Mis Inspecciones' });
    }
    
    // Deduplicate items just in case
    return Array.from(new Map(items.map(item => [item.href, item])).values());
};


interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, can } = useAuth();
  
  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  }
  
  const { navItems, moduleTitle, isSubModule } = React.useMemo(() => {
    if (!user) return { navItems: [], moduleTitle: '', isSubModule: false };

    let navItems: { href: string; icon: React.ElementType; label: string; }[] = [];
    let title = '';
    let isSub = true;
    
    const isSupervisorModule = pathname.startsWith('/dashboard/supervisor');
    const isWorkerModule = pathname.startsWith('/dashboard/worker');
    
    if (isWorkerModule) {
        title = 'Módulo Herramientas';
        if (user.role === 'worker' || user.role === 'cphs') {
            navItems = workerNavItems(can);
        }
    } else if (isSupervisorModule) {
        title = 'Módulo de Terreno';
        if (['supervisor', 'apr', 'bodega-admin'].includes(user.role)) {
            navItems = supervisorNavItems(can);
        }
    } else if (pathname.startsWith('/dashboard/admin') && !pathname.startsWith('/dashboard/admin/permissions')) {
        navItems = warehouseNavItems(can);
        title = 'Módulo Bodega';
    } else if (pathname.startsWith('/dashboard/users')) {
        navItems = usersNavItems(can);
        title = 'Módulo de Usuarios';
    } else if (pathname.startsWith('/dashboard/admin/permissions')) {
        navItems = permissionsNavItems;
        title = 'Gestión de Permisos';
    } else if (pathname.startsWith('/dashboard/attendance')) {
        navItems = attendanceNavItems(can);
        title = 'Módulo de Asistencia';
    } else if (pathname.startsWith('/dashboard/safety')) {
        navItems = safetyNavItems(can);
        title = 'Prevención de Riesgos';
    } else if (pathname.startsWith('/dashboard/payments')) {
        navItems = paymentsNavItems(can);
        title = 'Módulo de Pagos';
    } else if (pathname.startsWith('/dashboard/reports')) {
        navItems = reportsNavItems(can);
        title = 'Estadísticas y Reportes';
    } else if (pathname.startsWith('/dashboard/subscriptions')) {
        navItems = subscriptionsNavItems;
        title = 'Módulo de Suscripciones';
    } else if (pathname.startsWith('/dashboard/purchasing')) {
        navItems = purchasingNavItems(can);
        title = 'Gestión de Compras';
    } else if (pathname.startsWith('/dashboard/profile')) {
        navItems = []; // No items inside profile
        title = 'Mi Perfil';
    } else { 
        isSub = false;
        title = 'Portal de Módulos';
        navItems = allModules
            .filter(module => {
                 if (module.href.startsWith('/dashboard/supervisor')) {
                    return ['supervisor', 'apr', 'bodega-admin'].includes(user.role);
                }
                 if (module.href.startsWith('/dashboard/worker')) {
                    return ['worker', 'cphs'].includes(user.role);
                }
                return can(module.permission)
            })
            .map(m => ({ ...m, label: m.title }))
            .filter((value, index, self) => self.findIndex(v => v.title === value.title) === index);
    }
    
    return { navItems, moduleTitle: title, isSubModule: isSub };

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
            {navItems.map(item => {
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
                </Link>
            )})}
          </nav>
        </div>
      </div>
    </>
  );
}
