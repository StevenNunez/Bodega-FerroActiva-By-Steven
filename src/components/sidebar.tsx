
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Users,
  ClipboardList,
  LogOut,
  Warehouse,
  Package,
  PlusCircle,
  QrCode,
  ShoppingCart,
  Briefcase,
  PackagePlus,
  FileText,
} from 'lucide-react';

import { useAuth } from '@/contexts/app-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const adminNavItems = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/admin/tools', icon: Wrench, label: 'Herramientas' },
  { href: '/dashboard/admin/materials', icon: Package, label: 'Materiales' },
  { href: '/dashboard/admin/requests', icon: ClipboardList, label: 'Solicitudes de Materiales' },
  { href: '/dashboard/admin/purchase-requests', icon: ShoppingCart, label: 'Solicitudes de Compra' },
  { href: '/dashboard/admin/suppliers', icon: Briefcase, label: 'Proveedores' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Usuarios' },
];

const supervisorNavItems = [
  { href: '/dashboard/supervisor', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/supervisor/request', icon: PlusCircle, label: 'Solicitar Materiales' },
  { href: '/dashboard/supervisor/purchase-request', icon: ShoppingCart, label: 'Solicitar Compra' },
];

const workerNavItems = [
  { href: '/dashboard/worker', icon: Wrench, label: 'Mis Herramientas' },
];

const operationsNavItems = [
    { href: '/dashboard/operations', icon: Briefcase, label: 'Gestión de Compras' },
    { href: '/dashboard/operations/lots', icon: PackagePlus, label: 'Gestión de Lotes' },
    { href: '/dashboard/operations/orders', icon: FileText, label: 'Órdenes de Compra' },
];

const navItems = {
  admin: adminNavItems,
  supervisor: supervisorNavItems,
  worker: workerNavItems,
  operations: operationsNavItems,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

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
      default: return 'Usuario';
    }
  }

  return (
    <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
      <div className="flex items-center gap-2 px-2 py-4">
        <Warehouse className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">Control de Bodega</h1>
      </div>
      <nav className="flex flex-1 flex-col justify-between">
        <ul className="space-y-2">
          {userNavItems.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  { 'bg-primary/10 text-primary': pathname.startsWith(item.href) && (item.href !== '/dashboard/admin' && item.href !== '/dashboard/supervisor' && item.href !== '/dashboard/operations' || pathname === item.href) }
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div>
            <div className='p-2 my-4 rounded-lg bg-muted'>
                <p className='text-sm font-semibold'>{user?.name}</p>
                <p className='text-xs text-muted-foreground'>{user ? getRoleDisplayName(user.role) : ''}</p>
            </div>
          <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </nav>
    </aside>
  );
}