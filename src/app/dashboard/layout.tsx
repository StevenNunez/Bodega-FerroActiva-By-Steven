"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAppState } from "@/contexts/app-provider";
import { Sidebar } from "@/components/sidebar";
import { Menu, Loader2, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { requests, purchaseRequests } = useAppState();
  const { toast } = useToast();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [audioError, setAudioError] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Pre-carga del audio
  React.useEffect(() => {
    try {
      audioRef.current = new Audio("/sounds/alarm.mp3");
      audioRef.current.addEventListener("error", () => {
        console.error("Error al cargar el audio: archivo no encontrado o inválido");
        setAudioError(true);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el archivo de sonido para notificaciones. Verifica que '/sounds/alarm.mp3' exista.",
        });
      });
      audioRef.current.load();
    } catch (err) {
      console.error("Error al inicializar el audio:", err);
      setAudioError(true);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo inicializar el audio para notificaciones.",
      });
    }
  }, [toast]);

  // Cargar preferencia de sonido desde localStorage
  React.useEffect(() => {
    const savedSoundPreference = localStorage.getItem("soundEnabled");
    if (savedSoundPreference === "true" && !audioError) {
      setSoundEnabled(true);
    }
  }, [audioError]);

  // Toggle para activar/desactivar sonido
  const toggleSound = React.useCallback(() => {
    if (audioError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El audio no está disponible. Verifica el archivo de sonido.",
      });
      return;
    }

    if (!audioRef.current) {
      console.error("audioRef no está inicializado");
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo inicializar el audio.",
      });
      return;
    }

    if (soundEnabled) {
      setSoundEnabled(false);
      localStorage.setItem("soundEnabled", "false");
      toast({
        title: "Sonido Desactivado",
        description: "Las notificaciones de sonido han sido desactivadas.",
      });
    } else {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause();
          audioRef.current.currentTime = 0;
          setSoundEnabled(true);
          localStorage.setItem("soundEnabled", "true");
          toast({
            title: "Sonido Activado",
            description: "Las notificaciones de sonido han sido activadas.",
          });
        })
        .catch((err) => {
          console.error("Error al habilitar audio:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo activar el sonido. Intenta de nuevo.",
          });
        });
    }
  }, [soundEnabled, audioError, toast]);

  // Solicitudes pendientes
  const pendingMaterialRequests = React.useMemo(() => {
    return (requests || []).filter((r) => r.status === "pending").length;
  }, [requests]);

  const pendingPurchaseRequests = React.useMemo(() => {
    return (purchaseRequests || []).filter((pr) => pr.status === "pending").length;
  }, [purchaseRequests]);

  const prevPendingMaterialRequests = React.useRef(pendingMaterialRequests);
  const prevPendingPurchaseRequests = React.useRef(pendingPurchaseRequests);

  // Efecto: reproducir alarma si aumentan los pendientes
  React.useEffect(() => {
    if (!soundEnabled || !user || !audioRef.current || audioError) return;

    // Alarma para Administrador (solicitudes de stock)
    if (
      user.role === "admin" &&
      prevPendingMaterialRequests.current < pendingMaterialRequests
    ) {
      audioRef.current
        .play()
        .catch((e) => {
          console.error("Error al reproducir sonido para admin:", e);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo reproducir la notificación de sonido.",
          });
        });
    }

    // Alarma para Jefe de Operaciones (solicitudes de compra)
    if (
      user.role === "operations" &&
      prevPendingPurchaseRequests.current < pendingPurchaseRequests
    ) {
      audioRef.current
        .play()
        .catch((e) => {
          console.error("Error al reproducir sonido para operations:", e);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo reproducir la notificación de sonido.",
          });
        });
    }

    prevPendingMaterialRequests.current = pendingMaterialRequests;
    prevPendingPurchaseRequests.current = pendingPurchaseRequests;
  }, [pendingMaterialRequests, pendingPurchaseRequests, user, soundEnabled, audioError, toast]);

  // Redirección si no hay sesión
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Loader mientras carga sesión
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

  // Contar solicitudes pendientes según el rol
  const pendingCount =
    user.role === "admin" ? pendingMaterialRequests : user.role === "operations" ? pendingPurchaseRequests : 0;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] overflow-x-hidden">
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

          <div className="flex-1" />

          {/* Botón para activar/desactivar sonido */}
          {(user?.role === "admin" || user?.role === "operations") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSound}
                      className={cn(
                        "flex items-center gap-2",
                        soundEnabled ? "bg-green-100" : "bg-muted",
                        audioError && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={audioError}
                      aria-label={
                        audioError
                          ? "Notificaciones de sonido no disponibles"
                          : soundEnabled
                          ? "Desactivar notificaciones de sonido"
                          : "Activar notificaciones de sonido"
                      }
                      aria-describedby="sound-button-description"
                    >
                      {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      {soundEnabled ? "Sonido Activado" : "Activar Sonido"}
                    </Button>
                    {pendingCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                {audioError && (
                  <TooltipContent>
                    <p className="max-w-xs">
                      No se pudo cargar el archivo de sonido. Verifica que '/sounds/alarm.mp3' exista.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
              <span id="sound-button-description" className="sr-only">
                {audioError
                  ? "Notificaciones de sonido no disponibles debido a un error"
                  : soundEnabled
                  ? "Desactiva las notificaciones de sonido para nuevas solicitudes"
                  : "Activa las notificaciones de sonido para nuevas solicitudes"}
              </span>
            </TooltipProvider>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}