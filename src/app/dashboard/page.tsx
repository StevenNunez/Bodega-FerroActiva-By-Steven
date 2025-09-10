
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/app-provider';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirectPage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Solo redirigir cuando el estado de autenticación ya no esté cargando.
    if (!authLoading) {
      if (user) {
        const { role } = user;
        if (role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (role === 'supervisor') {
          router.replace('/dashboard/supervisor');
        } else if (role === 'worker') {
          router.replace('/dashboard/worker');
        } else if (role === 'operations') {
          router.replace('/dashboard/operations');
        } else if (role === 'apr') {
            router.replace('/dashboard/apr');
        }
      } else {
          // Si no hay usuario y no está cargando, entonces redirigir a login.
          router.replace('/login');
      }
    }
  }, [user, authLoading, router]);
  
  // Muestra un loader mientras se determina el estado de autenticación.
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
}
