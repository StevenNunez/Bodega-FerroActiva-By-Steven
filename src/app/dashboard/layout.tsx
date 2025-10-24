
"use client";

import * as React from "react";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useAppState } from "@/contexts/app-provider";
import { Sidebar } from "@/components/sidebar";
import { Menu, Loader2, Bell, Volume2, VolumeX, AlertCircle, ShoppingCart, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { differenceInDays, startOfDay } from 'date-fns';
import { Timestamp } from "firebase/firestore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { 
    requests, 
    purchaseRequests, 
    supplierPayments, 
    suppliers,
    tenants, 
    currentTenantId, 
    setCurrentTenantId
  } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);

  const showSidebar = pathname !== "/dashboard";
  const today = startOfDay(new Date());

  const overduePayments = React.useMemo(() => supplierPayments.filter(p => {
    if (p.status === 'paid') return false;
    const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
    return differenceInDays(dueDate, today) < 0;
  }), [supplierPayments, today]);

  const dueSoonPayments = React.useMemo(() => supplierPayments.filter(p => {
    if (p.status === 'paid') return false;
    const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
    const daysLeft = differenceInDays(dueDate, today);
    return daysLeft >= 0 && daysLeft <= 7;
  }), [supplierPayments, today]);

  const pendingMaterialRequests = React.useMemo(() => (requests || []).filter((r) => r.status === "pending").length, [requests]);
  const pendingPurchaseRequests = React.useMemo(() => (purchaseRequests || []).filter((pr) => pr.status === "pending").length, [purchaseRequests]);
  
  const totalNotifications = React.useMemo(() => {
    let count = 0;
    if (user?.role === 'admin' || user?.role === 'super-admin') {
      count = pendingMaterialRequests + pendingPurchaseRequests + overduePayments.length + dueSoonPayments.length;
    } else if (user?.role === 'operations') {
      count = pendingPurchaseRequests + overduePayments.length + dueSoonPayments.length;
    } else if (user?.role === 'finance') {
      count = overduePayments.length + dueSoonPayments.length;
    }
    return count;
  }, [user, pendingMaterialRequests, pendingPurchaseRequests, overduePayments, dueSoonPayments]);
  
  const supplierMap = React.useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
  
  const playNotificationSound = React.useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
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
  }, [isMuted]);

  React.useEffect(() => {
    if (totalNotifications > 0) playNotificationSound();
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(totalNotifications).catch((e: any) => console.error("Error setting app badge:", e));
    }
  }, [totalNotifications, playNotificationSound]);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
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
                <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Abrir menú de navegación">
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
             {user.role === 'super-admin' && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">
                                Viendo a: {tenants.find(t => t.id === currentTenantId)?.name || "Todos"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Cambiar de Inquilino</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setCurrentTenantId(null)}>
                            Ver Todos los Inquilinos
                        </DropdownMenuItem>
                        {tenants.map(tenant => (
                            <DropdownMenuItem key={tenant.id} onSelect={() => setCurrentTenantId(tenant.id)}>
                                {tenant.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
             )}

             <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  <span className="sr-only">{isMuted ? 'Activar sonido' : 'Silenciar'}</span>
              </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                       <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0">
                         {totalNotifications}
                       </Badge>
                    )}
                     <span className="sr-only">Abrir notificaciones</span>
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Centro de Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {totalNotifications === 0 ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">No hay notificaciones nuevas.</DropdownMenuItem>
                ) : (
                  <>
                    {(user.role === 'admin' || user.role === 'operations' || user.role === 'super-admin') && pendingPurchaseRequests > 0 && (
                      <Link href="/dashboard/operations">
                        <DropdownMenuItem>
                          <ShoppingCart className="mr-2 h-4 w-4 text-cyan-500" />
                          <span>{pendingPurchaseRequests} Solicitud(es) de Compra</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {(user.role === 'admin' || user.role === 'super-admin') && pendingMaterialRequests > 0 && (
                      <Link href="/dashboard/admin/requests">
                         <DropdownMenuItem>
                          <ClipboardList className="mr-2 h-4 w-4 text-purple-500"/>
                          <span>{pendingMaterialRequests} Solicitud(es) de Material</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {(user.role === 'admin' || user.role === 'operations' || user.role === 'finance' || user.role === 'super-admin') && overduePayments.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-red-500">Pagos Vencidos</DropdownMenuLabel>
                        {overduePayments.map(p => (
                          <Link key={p.id} href="/dashboard/admin/payments">
                            <DropdownMenuItem className="text-red-500">
                              <AlertCircle className="mr-2 h-4 w-4"/>
                              <span>Factura {p.invoiceNumber} ({supplierMap.get(p.supplierId) || 'N/A'}) vencida.</span>
                            </DropdownMenuItem>
                          </Link>
                        ))}
                      </>
                    )}
                     {(user.role === 'admin' || user.role === 'operations' || user.role === 'finance' || user.role === 'super-admin') && dueSoonPayments.length > 0 && (
                       <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-amber-500">Pagos por Vencer</DropdownMenuLabel>
                        {dueSoonPayments.map(p => (
                          <Link key={p.id} href="/dashboard/admin/payments">
                             <DropdownMenuItem className="text-amber-500">
                              <AlertCircle className="mr-2 h-4 w-4"/>
                              <span>Factura {p.invoiceNumber} ({supplierMap.get(p.supplierId) || 'N/A'}) vence en {differenceInDays(p.dueDate as Date, today)} días.</span>
                            </DropdownMenuItem>
                          </Link>
                        ))}
                       </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
