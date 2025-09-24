
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useAppState } from "@/contexts/app-provider";
import { Sidebar } from "@/components/sidebar";
import { Menu, Loader2, Bell, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { requests, purchaseRequests } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);

  // Determine if the current page should have a sidebar.
  // The main hub page (/dashboard) will not have it.
  const showSidebar = pathname !== "/dashboard";


  const pendingMaterialRequests = React.useMemo(() => {
    return (requests || []).filter((r) => r.status === "pending").length;
  }, [requests]);

  const pendingPurchaseRequests = React.useMemo(() => {
    return (purchaseRequests || []).filter((pr) => pr.status === "pending").length;
  }, [purchaseRequests]);

  const pendingCount =
    user?.role === "admin" ? pendingMaterialRequests : user?.role === "operations" ? pendingPurchaseRequests : 0;
  
  const playNotificationSound = React.useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API no es soportada por este navegador.");
      return;
    }
    const audioContext = new AudioContext();

    function playTone(frequency: number, startTime: number, duration: number) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    const now = audioContext.currentTime;
    playTone(980, now, 0.15);
    playTone(780, now + 0.2, 0.15);
    playTone(980, now + 0.4, 0.15);
    playTone(780, now + 0.6, 0.25);

  }, [isMuted]);

  React.useEffect(() => {
    if (pendingCount > 0) {
      playNotificationSound();
    }
  }, [pendingCount, playNotificationSound]);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2" role="alert">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  const layoutClasses = showSidebar
    ? "grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
    : "flex min-h-screen w-full flex-col";

  return (
    <div className={layoutClasses}>
      {showSidebar && (
        <div className="hidden border-r bg-muted/40 md:block">
          <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
        </div>
      )}
      
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {showSidebar && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                  aria-label="Abrir menú de navegación"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú de navegación</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 transition-transform duration-300">
                <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-4">
             {(user?.role === "admin" || user?.role === "operations") && (
                <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    <span className="sr-only">{isMuted ? 'Activar sonido' : 'Silenciar'}</span>
                </Button>
             )}
            {pendingCount > 0 && (
                <div className="relative flex items-center">
                <Bell className="h-5 w-5" />
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                >
                    {pendingCount}
                </Badge>
                </div>
            )}
           </div>

        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
