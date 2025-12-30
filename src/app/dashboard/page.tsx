
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useAppState } from '@/modules/core/contexts/app-provider';
import { 
  Loader2, Warehouse, CalendarCheck, User as UserIcon, DollarSign, 
  ShieldCheck, BarChart3, ListChecks, ShoppingCart, HardHat, Wrench, AlertCircle, Construction, Wallet
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { UserCredentialCard } from '@/components/user-credential-card';
import type { Permission } from '@/modules/core/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserRole } from '@/modules/core/lib/data';

interface ModuleCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ href, icon: Icon, title, description }) => (
  <Link href={href} className="group">
    <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-8 w-8 transition-transform group-hover:scale-110" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  </Link>
);

export default function DashboardHubPage() {
  const { user, authLoading } = useAuth();
  const { can } = useAppState();
  const router = useRouter();

  React.useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'guardia') {
      router.replace('/dashboard/attendance/registry');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando portal...</p>
        </div>
      </div>
    );
  }

  const allModules: (ModuleCardProps & { permission?: Permission, roles?: UserRole[], superadminOnly?: boolean })[] = [
    { href: '/dashboard/construction-control', icon: Construction, title: "Control de Obra", description: "Gestiona el avance físico de la obra.", permission: 'module_construction_control:view' },
    { href: '/dashboard/admin', icon: Warehouse, title: "Módulo de Bodega", description: "Gestiona inventario, herramientas y solicitudes.", permission: 'module_warehouse:view' },
    { href: '/dashboard/purchasing', icon: ShoppingCart, title: "Módulo Compras", description: "Gestiona adquisiciones, lotes y órdenes de compra.", permission: 'module_purchasing:view' },
    { href: '/dashboard/users', icon: UserIcon, title: "Módulo de Usuarios", description: "Gestiona los perfiles y roles de los trabajadores.", permission: 'module_users:view' },
    { href: '/dashboard/subscriptions', icon: DollarSign, title: "Módulo de Suscripciones", description: "Gestiona los inquilinos (clientes) de la plataforma.", superadminOnly: true },
    { href: '/dashboard/safety', icon: ShieldCheck, title: "Módulo de Prevención", description: "Gestión de checklists, plantillas y revisiones de seguridad.", permission: 'module_safety:view' },
    { href: '/dashboard/attendance', icon: CalendarCheck, title: "Módulo de Asistencia", description: "Control de entrada/salida del personal.", permission: 'module_attendance:view' },
    { href: '/dashboard/payments', icon: DollarSign, title: "Módulo de Pagos", description: "Gestiona las facturas y pagos a proveedores.", permission: 'module_payments:view' },
    { href: '/dashboard/reports', icon: BarChart3, title: "Módulo de Reportes", description: "Analiza consumos y genera informes.", permission: 'module_reports:view' },
    { href: '/dashboard/permissions', icon: ListChecks, title: "Gestión de Permisos", description: "Define y ajusta lo que cada rol puede hacer en la plataforma.", permission: 'permissions:manage' },
    { href: '/dashboard/worker', icon: Wallet, title: "Mi Billetera Digital", description: "Consulta tu saldo ganado y solicita adelantos de sueldo.", roles: ['worker'] },
    { href: '/dashboard/supervisor', icon: HardHat, title: "Módulo de Terreno", description: "Solicita materiales y gestiona tareas de seguridad.", roles: ['supervisor', 'apr', 'bodega-admin', 'jefe-terreno', 'jefe-oficina-tecnica'] },
    { href: '/dashboard/cphs', icon: ShieldCheck, title: "Módulo Comité Paritario", description: "Accede a las herramientas de gestión de seguridad del comité.", roles: ['cphs'] },
  ];

  const visibleModules = React.useMemo(() => {
    return allModules.filter(m => {
        if (user.role === 'super-admin') return true;
        if (m.superadminOnly) return false;
        if (m.roles) return m.roles.includes(user.role);
        if (m.permission) return can(m.permission);
        return false; // No mostrar si no cumple ninguna condición explícita
    }).filter((value, index, self) => self.findIndex(v => v.href === value.href) === index);
  }, [user, can]);
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bienvenido, ${user.name}`}
        description="Selecciona el módulo al que deseas acceder o gestiona tu perfil."
      />

      {visibleModules.length === 0 && user.role !== 'guardia' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin Módulos Asignados</AlertTitle>
          <AlertDescription>
            Tu rol actual no tiene permisos para ver ningún módulo. Contacta a un administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <UserCredentialCard />

        <ModuleCard
          href="/dashboard/profile"
          icon={UserIcon}
          title="Mi Perfil"
          description="Consulta tu información personal y de planilla."
        />

        {visibleModules.map(module => (
          <ModuleCard key={module.href} {...module} />
        ))}
      </div>
    </div>
  );
}
