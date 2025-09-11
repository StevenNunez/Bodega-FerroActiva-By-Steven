
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAppState } from '@/contexts/app-provider';
import { Sidebar } from '@/components/sidebar';
import { Menu, Warehouse, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { requests } = useAppState();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const pendingMaterialRequests = React.useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);
  const prevPendingMaterialRequests = React.useRef(pendingMaterialRequests);

  React.useEffect(() => {
    if (user?.role !== 'admin') return;
    
    // Solo suena si el número de pendientes ha aumentado
    if (prevPendingMaterialRequests.current < pendingMaterialRequests) {
        // Y solo si la ventana está activa, para no molestar si el usuario está en otra pestaña
        if (document.hasFocus()) {
            try {
                const audio = new Audio('/sounds/alarm.mp3');
                audio.play().catch(e => {
                    // Este catch es importante para ver errores si el navegador bloquea la reproducción
                    console.error("Error al reproducir sonido:", e);
                });
            } catch (e) {
                console.error("Error al crear el objeto Audio:", e);
            }
        }
    }
    
    // Actualizamos el valor anterior con el actual para la próxima comparación
    prevPendingMaterialRequests.current = pendingMaterialRequests;
  }, [pendingMaterialRequests, user?.role]);


  React.useEffect(() => {
    if (!authLoading && user === null) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

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
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
           <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
               <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className='flex-1'>
            {/* Header content can go here if needed */}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </div>
    </div>
  );
}
