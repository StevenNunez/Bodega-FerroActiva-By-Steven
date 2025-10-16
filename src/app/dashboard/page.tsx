'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/app-provider';
import { Loader2, Warehouse, CalendarCheck, User as UserIcon, DollarSign, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { UserCredentialCard } from '@/components/user-credential-card';

export default function DashboardHubPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
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

  // Define role-specific warehouse dashboard paths
  const warehouseDashboardPaths: { [key: string]: string } = {
    admin: '/dashboard/admin',
    supervisor: '/dashboard/supervisor',
    worker: '/dashboard/worker',
    operations: '/dashboard/operations',
    apr: '/dashboard/apr',
  };
  
  // Special case for 'guardia' to redirect directly to the attendance module
  if (user.role === 'guardia') {
      router.replace('/dashboard/attendance/registry');
      return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirigiendo...</p>
            </div>
        </div>
      );
  }

  const warehousePath = warehouseDashboardPaths[user.role];
  const attendancePath = '/dashboard/attendance/registry';
  const profilePath = '/dashboard/profile';
  const paymentsPath = '/dashboard/payments';
  const safetyPath = '/dashboard/safety';
  
  const canSeeAttendance = ['admin', 'operations'].includes(user.role);
  const canSeePayments = ['admin', 'operations', 'finance'].includes(user.role);
  const canSeeSafety = ['admin', 'apr', 'supervisor', 'operations'].includes(user.role);


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bienvenido, ${user.name}`}
        description="Selecciona el módulo al que deseas acceder o gestiona tu perfil."
      />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            
            <UserCredentialCard />

            <Link href={profilePath} className="group">
              <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UserIcon className="h-8 w-8 transition-transform group-hover:scale-110" />
                  </div>
                  <div>
                    <CardTitle>Módulo de Perfil</CardTitle>
                    <CardDescription className="mt-1">
                      Consulta tu información personal y de planilla.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            
            {warehousePath && (
              <Link href={warehousePath} className="group">
                <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Warehouse className="h-8 w-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                      <CardTitle>Módulo de Bodega</CardTitle>
                      <CardDescription className="mt-1">
                        Gestiona inventario, herramientas, solicitudes y compras.
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )}
            
            {canSeeSafety && (
                <Link href={safetyPath} className="group">
                <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="h-8 w-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                        <CardTitle>Módulo de Prevención de Riesgos</CardTitle>
                        <CardDescription className="mt-1">
                        Gestión de checklists, plantillas y revisiones de seguridad.
                        </CardDescription>
                    </div>
                    </CardHeader>
                </Card>
                </Link>
            )}
            
            {canSeeAttendance && (
                <Link href={attendancePath} className="group">
                <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarCheck className="h-8 w-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                        <CardTitle>Módulo de Asistencia</CardTitle>
                        <CardDescription className="mt-1">
                        Control de entrada y salida de personal, y reportes.
                        </CardDescription>
                    </div>
                    </CardHeader>
                </Card>
                </Link>
            )}

            {canSeePayments && (
                <Link href={paymentsPath} className="group">
                <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <DollarSign className="h-8 w-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                        <CardTitle>Módulo de Pagos</CardTitle>
                        <CardDescription className="mt-1">
                         Gestiona las facturas y pagos a proveedores.
                        </CardDescription>
                    </div>
                    </CardHeader>
                </Card>
                </Link>
            )}
      </div>
    </div>
  );
}
