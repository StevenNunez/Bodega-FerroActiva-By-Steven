
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/app-provider';
import { Loader2, Warehouse, CalendarCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

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

  const warehousePath = warehouseDashboardPaths[user.role] || '/dashboard';
  const attendancePath = '/dashboard/attendance/registry';
  const canSeeAttendance = ['admin', 'operations'].includes(user.role);


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bienvenido, ${user.name}`}
        description="Selecciona el módulo al que deseas acceder."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:max-w-4xl">
        {/* Bodega Module Card */}
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
        
         {/* Asistencia Module Card */}
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
      </div>
    </div>
  );
}
