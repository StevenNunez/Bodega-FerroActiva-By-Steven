'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAppState } from '@/contexts/app-provider';
import { Sidebar } from '@/components/sidebar';
import { Menu, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { requests, purchaseRequests } = useAppState();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // 🔔 Manejo de audio
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(false);

  // Pre-carga del audio
  React.useEffect(() => {
    audioRef.current = new Audio('/sounds/alarm.mp3');
    audioRef.current.load();
    console.log('Audio inicializado:', audioRef.current.src);
  }, []);

  // Cargar preferencia de sonido desde localStorage
  React.useEffect(() => {
    const savedSoundPreference = localStorage.getItem('soundEnabled');
    if (savedSoundPreference === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  // Permitir sonido (debe ser iniciado por usuario)
  const enableSound = () => {
    if (!audioRef.current) {
      console.error('audioRef no está inicializado');
      return;
    }
    console.log('Intentando activar sonido...');
    audioRef.current.play().then(() => {
      console.log('Sonido habilitado');
      audioRef.current?.pause();
      audioRef.current.currentTime = 0;
      setSoundEnabled(true);
      localStorage.setItem('soundEnabled', 'true');
    }).catch((err) => {
      console.error('Error al habilitar audio:', err);
    });
  };

  // Solicitudes pendientes
  const pendingMaterialRequests = React.useMemo(() => {
    return (requests || []).filter(r => r.status === 'pending').length;
  }, [requests]);
  const prevPendingMaterialRequests = React.useRef(pendingMaterialRequests);

  const pendingPurchaseRequests = React.useMemo(() => {
      return (purchaseRequests || []).filter(pr => pr.status === 'pending').length;
  }, [purchaseRequests]);
  const prevPendingPurchaseRequests = React.useRef(pendingPurchaseRequests);

  // Efecto: reproducir alarma si aumentan los pendientes
  React.useEffect(() => {
    if (!soundEnabled || !user) return;
    
    // Alarma para Administrador (solicitudes de stock)
    if (user.role === 'admin' && prevPendingMaterialRequests.current < pendingMaterialRequests) {
        console.log('Reproduciendo alarma para ADMIN...');
        audioRef.current?.play().catch(e => console.error('Error al reproducir sonido para admin:', e));
    }

    // Alarma para Jefe de Operaciones (solicitudes de compra)
    if (user.role === 'operations' && prevPendingPurchaseRequests.current < pendingPurchaseRequests) {
        console.log('Reproduciendo alarma para OPERATIONS...');
        audioRef.current?.play().catch(e => console.error('Error al reproducir sonido para operations:', e));
    }

    prevPendingMaterialRequests.current = pendingMaterialRequests;
    prevPendingPurchaseRequests.current = pendingPurchaseRequests;

  }, [pendingMaterialRequests, pendingPurchaseRequests, user, soundEnabled]);

  // Redirección si no hay sesión
  React.useEffect(() => {
    if (!authLoading && !user) {
      console.log('Redirigiendo a /login');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Loader mientras carga sesión
  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Sidebar móvil */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
              <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {/* Botón para activar sonido */}
          {(user?.role === 'admin' || user?.role === 'operations') && (
            <Button
              variant="outline"
              size="sm"
              onClick={enableSound}
              className={`flex items-center gap-2 ${soundEnabled ? 'bg-green-100' : ''}`}
              aria-label={soundEnabled ? 'Sonido activado' : 'Activar notificaciones de sonido'}
            >
              <Bell className="h-4 w-4" />
              {soundEnabled ? 'Sonido activado' : 'Activar sonido'}
            </Button>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
