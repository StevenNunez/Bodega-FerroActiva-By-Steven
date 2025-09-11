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
} from 'lucide-react';

import { useAppState, useAuth } from '@/contexts/app-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const adminNavItems = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/admin/tools', icon: Wrench, label: 'Herramientas' },
  { href: '/dashboard/admin/materials', icon: Package, label: 'Materiales' },
  { href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Solicitudes de Materiales', notificationKey: 'pendingMaterialRequests' },
  { href: '/dashboard/admin/purchase-requests', icon: ShoppingCart, label: 'Solicitudes de Compra' },
  { href: '/dashboard/admin/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/admin/purchase-request-form', icon: ShoppingCart, label: 'Solicitar Compra' },
  { href: '/dashboard/admin/suppliers', icon: Briefcase, label: 'Proveedores' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/dashboard/admin/bulk-import', icon: Upload, label: 'Importación Masiva' },
  { href: '/dashboard/admin/certificate', icon: Medal, label: 'Mi Certificado' },
];

const supervisorNavItems = [
  { href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/supervisor/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/supervisor/purchase-request', icon: ShoppingCart, label: 'Solicitar Compra' },
];

const aprNavItems = [
  { href: '/dashboard/apr', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/apr/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/apr/purchase-request', icon: ShoppingCart, label: 'Solicitar Compra' },
];

const workerNavItems = [
  { href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' },
];

const operationsNavItems = [
    { href: '/dashboard/operations', icon: Briefcase, label: 'Gestión de Compras', notificationKey: 'pendingPurchaseRequests' },
    { href: '/dashboard/operations/lots', icon: PackagePlus, label: 'Gestión de Lotes' },
    { href: '/dashboard/operations/orders', icon: FileText, label: 'Órdenes de Compra' },
];

const navItems = {
  admin: adminNavItems,
  supervisor: supervisorNavItems,
  worker: workerNavItems,
  operations: operationsNavItems,
  apr: aprNavItems,
};

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { requests, purchaseRequests } = useAppState();

  const pendingMaterialRequests = React.useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);
  const pendingPurchaseRequests = React.useMemo(() => purchaseRequests.filter(pr => pr.status === 'pending').length, [purchaseRequests]);
  
  const notificationCounts = {
    pendingMaterialRequests,
    pendingPurchaseRequests
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const userNavItems = user ? navItems[user.role] : [];
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador de Bodega';
      case 'supervisor': return 'Supervisor';
      case 'worker': return 'Colaborador';
      case 'operations': return 'Jefe de Operaciones';
      case 'apr': return 'APR';
      default: return 'Usuario';
    }
  }

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  }

  return (
    <>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={handleLinkClick}>
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="">Control de Bodega</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {userNavItems.map(item => {
              const notifCount = item.notificationKey ? notificationCounts[item.notificationKey as keyof typeof notificationCounts] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    { 'bg-primary/10 text-primary': pathname.startsWith(item.href) && (item.href !== '/dashboard/admin' && item.href !== '/dashboard/supervisor' && item.href !== '/dashboard/operations' && item.href !== '/dashboard/apr' || pathname === item.href) }
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
