
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
  Crown,
  Construction,
  CheckSquare,
  GanttChartSquare,
  Wallet,
  HandPlatter
} from 'lucide-react';

import { useAuth, useAppState } from '@/modules/core/contexts/app-provider';
import { cn } from '@/lib/utils';
import { UserRole } from '@/modules/core/lib/data';
import type { Permission } from '@/modules/core/lib/permissions';
import { TenantSwitcher } from '@/components/TenantSwitcher';

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
    if (can('units:create')) items.push({ href: '/dashboard/admin/units', icon: Ruler, label: 'Unidades' });
    
    return items;
}

const supervisorNavItems = (can: (p: Permission) => boolean) => {
    const items = [];

    if(can('module_warehouse:view')) items.push({ href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Resumen Supervisor' });
    if (can('tools:view_own')) items.push({ href: '/dashboard/worker', icon: Wallet, label: 'Mi Billetera Digital' });
    if (can('material_requests:create')) items.push({ href: '/dashboard/supervisor/request', icon: PlusCircle, label: 'Solicitar Materiales' });
    if (can('purchase_requests:create')) items.push({ href: '/dashboard/supervisor/purchase-request-form', icon: ShoppingCart, label: 'Solicitar Compra' });
    if (can('return_requests:create')) items.push({ href: '/dashboard/supervisor/return-request', icon: Undo2, label: 'Registrar Devolución' });
    
    return items;
};

const workerNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('tools:view_own')) {
        items.push({ href: '/dashboard/worker', icon: Wallet, label: 'Mi Billetera Digital' });
    }
    return items;
}

const cphsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('module_safety:view')) {
      items.push({ href: '/dashboard/cphs', icon: LayoutDashboard, label: 'Resumen CPHS' });
    }
    if (can('safety_templates:create')) {
      items.push({ href: '/dashboard/safety/templates', icon: FileUp, label: 'Gestión de Plantillas' });
    }
    if (can('safety_checklists:review')) {
      items.push({ href: '/dashboard/safety/review-checklists', icon: ShieldCheck, label: 'Revisar Checklists' });
    }
     if (can('safety_inspections:review')) {
      items.push({ href: '/dashboard/safety/review-inspections', icon: ShieldCheck, label: 'Revisar Inspecciones' });
     }
    if (can('safety_observations:review')) {
      items.push({ href: '/dashboard/safety/review-observations', icon: ShieldCheck, label: 'Revisar Observaciones' });
    }
    return items;
}

const purchasingNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_purchasing:view')) items.push({ href: '/dashboard/purchasing', icon: LayoutDashboard, label: 'Resumen' });
    if (can('purchase_requests:create')) items.push({ href: '/dashboard/purchasing/purchase-request-form', icon: Edit, label: 'Crear Solicitud Compra' });
    if (can('purchase_requests:view_all')) items.push({ href: '/dashboard/purchasing/purchase-requests', icon: ShoppingCart, label: 'Solicitudes de Compra' });
    if (can('lots:create')) items.push({ href: '/dashboard/purchasing/lots', icon: PackagePlus, label: 'Gestión de Lotes' });
    if (can('orders:create') || can('finance:manage_purchase_orders')) items.push({ href: '/dashboard/purchasing/orders', icon: FileText, label: 'Generador de Cotizaciones' });
    if (can('suppliers:view')) items.push({ href: '/dashboard/purchasing/suppliers', icon: Briefcase, label: 'Proveedores' });
    if (can('categories:view')) items.push({ href: '/dashboard/purchasing/categories', icon: FolderTree, label: 'Categorías' });

    return items;
};

const usersNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('users:view')) {
      items.push({ href: '/dashboard/users', icon: Users, label: 'Lista de Usuarios' });
    }
    if (can('permissions:manage')) {
        items.push({ href: '/dashboard/permissions', icon: ListChecks, label: 'Gestión de Permisos' });
    }
    if(can('users:print_qr')) {
       items.push({ href: '/dashboard/users/print-qrs', icon: QrCode, label: 'Imprimir Credenciales' });
    }
    return items;
};

const attendanceNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_attendance:view')) {
        items.push({ href: '/dashboard/attendance', icon: LayoutDashboard, label: 'Resumen' });
    }
    if (can('attendance:register')) {
        items.push({ href: '/dashboard/attendance/registry', icon: CalendarCheck, label: 'Registro de Asistencia' });
    }
    if (can('attendance:edit') || can('attendance:view')) {
        items.push({ href: '/dashboard/attendance/report', icon: BookOpen, label: 'Reporte Semanal' });
        items.push({ href: '/dashboard/attendance/monthly-report', icon: FileBarChart, label: 'Reporte Mensual' });
        items.push({ href: '/dashboard/attendance/overtime', icon: Clock, label: 'Horas Extras' });
        items.push({ href: '/dashboard/attendance/severance', icon: HandCoins, label: 'Generador de Finiquito' });
    }
    return items;
};

const paymentsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('payments:view')) items.push({ href: '/dashboard/payments', icon: LayoutDashboard, label: 'Gestión de Facturas' });
    if (can('payments:view')) items.push({ href: '/dashboard/payments/advances', icon: HandPlatter, label: 'Gestionar Adelantos' });
    if (can('finance:manage_purchase_orders')) items.push({ href: '/dashboard/purchasing/finance', icon: FileText, label: 'Gestionar OC' });
    if (can('orders:view_all')) items.push({ href: '/dashboard/payments/orders', icon: ClipboardList, label: 'Historial de OCs' });
    if (can('suppliers:view') && can('module_payments:view')) items.push({ href: '/dashboard/payments/suppliers', icon: Briefcase, label: 'Proveedores' });
    return items;
};

const reportsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if (can('reports:view')) {
        items.push({ href: '/dashboard/reports', icon: BarChart3, label: 'Estadísticas de Consumo' });
        items.push({ href: '/dashboard/reports/deliveries', icon: FileBarChart, label: 'Reporte de Entregas' });
        items.push({ href: '/dashboard/reports/inventory', icon: Warehouse, label: 'Reporte de Inventario' });
    }
    return items;
};

const subscriptionsNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_subscriptions:view')) {
        items.push({ href: '/dashboard/subscriptions', icon: Users, label: 'Suscriptores' });
        items.push({ href: '/dashboard/subscriptions/plans', icon: Crown, label: 'Planes y Permisos' });
    }
    return items;
};


const permissionsNavItems = [
    { href: '/dashboard/permissions', icon: ListChecks, label: 'Gestión de Permisos' },
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

const constructionControlNavItems = (can: (p: Permission) => boolean) => {
    const items = [];
    if(can('module_construction_control:view')) {
      items.push({ href: '/dashboard/construction-control', icon: LayoutDashboard, label: 'Resumen de Obra' });
    }
    if(can('construction_control:edit_structure') || can('construction_control:register_progress')) {
      items.push({ href: '/dashboard/construction-control/wbs', icon: FolderTree, label: 'Partidas (EDT)' });
    }
    if(can('construction_control:edit_structure')) {
      items.push({ href: '/dashboard/construction-control/gantt', icon: GanttChartSquare, label: 'Carta Gantt' });
    }
    if(can('construction_control:review_protocols')) {
      items.push({ href: '/dashboard/construction-control/revisar-protocolos', icon: CheckSquare, label: 'Revisar Protocolos' });
    }
    if(can('construction_control:register_progress')) {
      items.push({ href: '/dashboard/construction-control/mis-protocolos', icon: ClipboardList, label: 'Mis Protocolos' });
    }
    return items;
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
    
    const pathSegments = pathname.split('/').filter(Boolean);
    const mainModule = pathSegments[1];

    switch (mainModule) {
        case 'admin':
            navItems = warehouseNavItems(can);
            title = 'Módulo Bodega';
            break;
        case 'users':
            navItems = usersNavItems(can);
            title = 'Módulo de Usuarios';
            break;
        case 'attendance':
            navItems = attendanceNavItems(can);
            title = 'Módulo de Asistencia';
            break;
        case 'safety':
            navItems = safetyNavItems(can);
            title = 'Prevención de Riesgos';
            break;
        case 'payments':
            navItems = paymentsNavItems(can);
            title = 'Módulo de Pagos';
            break;
        case 'reports':
            navItems = reportsNavItems(can);
            title = 'Estadísticas y Reportes';
            break;
        case 'subscriptions':
            navItems = subscriptionsNavItems(can);
            title = 'Módulo de Suscripciones';
            break;
        case 'permissions':
            navItems = permissionsNavItems;
            title = 'Gestión de Permisos';
            break;
        case 'purchasing':
            navItems = purchasingNavItems(can);
            title = 'Gestión de Compras';
            break;
        case 'supervisor':
            title = 'Módulo de Terreno';
            navItems = supervisorNavItems(can);
            break;
        case 'worker':
            title = 'Módulo Trabajador';
            navItems = workerNavItems(can);
            break;
        case 'cphs':
            title = 'Módulo Comité Paritario';
            navItems = cphsNavItems(can);
            break;
        case 'construction-control':
            title = 'Control de Obra';
            navItems = constructionControlNavItems(can);
            break;
        case 'profile':
            navItems = [];
            title = 'Mi Perfil';
            break;
        default:
            isSub = false;
            title = 'Portal de Módulos';
            break;
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
        { user?.role === 'super-admin' &&
            <div className="mt-auto p-4 border-t">
                <TenantSwitcher />
            </div>
        }
      </div>
    </>
  );
}

    