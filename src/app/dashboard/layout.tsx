"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/useAuth";
import { useAppState } from "@/modules/data/useData";
import { Sidebar } from "@/components/sidebar";
import { Menu, Loader2, Bell, Volume2, VolumeX, AlertCircle, ShoppingCart, ClipboardList, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { differenceInDays, startOfDay } from 'date-fns';
import { Timestamp } from "firebase/firestore";
import { UserRole, type SupplierPayment, type MaterialRequest, type PurchaseRequest, type Supplier, type Tenant } from "@/modules/core/lib/data";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading, logout, tenants, currentTenantId, setCurrentTenantId } = useAuth();
  const { 
    requests, 
    purchaseRequests, 
    supplierPayments, 
    suppliers,
    can,
  } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  const today = startOfDay(new Date());

  React.useEffect(() => {
    setIsClient(true);
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Administrador de App';
        case 'bodega-admin': return 'Jefe de Bodega';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Administrador de Obra';
        case 'apr': return 'APR';
        case 'guardia': return 'Guardia';
        case 'finance': return 'Jefe de Adm. y Finanzas';
        case 'super-admin': return 'Super Administrador';
        default: return 'Usuario';
    }
  }

  const overduePayments = React.useMemo(() => (supplierPayments || []).filter((p: SupplierPayment) => {
    if (p.status === 'paid') return false;
    const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate as any);
    return differenceInDays(dueDate, today) < 0;
  }), [supplierPayments, today]);

  const dueSoonPayments = React.useMemo(() => (supplierPayments || []).filter((p: SupplierPayment) => {
    if (p.status === 'paid') return false;
    const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate as any);
    const daysLeft = differenceInDays(dueDate, today);
    return daysLeft >= 0 && daysLeft <= 7;
  }), [supplierPayments, today]);

  const pendingMaterialRequests = React.useMemo(() => (requests || []).filter((r: MaterialRequest) => r.status === "pending").length, [requests]);
  const pendingPurchaseRequests = React.useMemo(() => (purchaseRequests || []).filter((pr: PurchaseRequest) => pr.status === "pending").length, [purchaseRequests]);
  
  const totalNotifications = React.useMemo(() => {
    let count = 0;
    if (can('material_requests:approve')) count += pendingMaterialRequests;
    if (can('purchase_requests:approve')) count += pendingPurchaseRequests;
    if (can('payments:view')) {
        count += overduePayments.length;
        count += dueSoonPayments.length;
    }
    return count;
  }, [can, pendingMaterialRequests, pendingPurchaseRequests, overduePayments, dueSoonPayments]);
  
  const supplierMap = React.useMemo(() => new Map<string, string>((suppliers || []).map((s: Supplier) => [s.id, s.name])), [suppliers]);
  
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

  if (!isClient || authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  const isSubModulePage = pathname !== '/dashboard';

  return (
    <div className={cn(isSubModulePage ? "grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]" : "flex min-h-screen w-full flex-col")}>
      {isSubModulePage && (
        <div className="hidden border-r bg-muted/40 md:block">
          <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
        </div>
      )}
      
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {isSubModulePage && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Abrir menú de navegación">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú de navegación</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          )}

          <div className="w-full flex-1">
             {!isSubModulePage && (
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <span className="text-lg">Portal de Módulos</span>
                </Link>
             )}
          </div>

          <div className="flex items-center gap-2">
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
                    {can('purchase_requests:approve') && pendingPurchaseRequests > 0 && (
                      <Link href="/dashboard/purchasing/purchase-requests">
                        <DropdownMenuItem>
                          <ShoppingCart className="mr-2 h-4 w-4 text-cyan-500" />
                          <span>{pendingPurchaseRequests} Solicitud(es) de Compra</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {can('material_requests:approve') && pendingMaterialRequests > 0 && (
                      <Link href="/dashboard/admin/requests">
                         <DropdownMenuItem>
                          <ClipboardList className="mr-2 h-4 w-4 text-purple-500"/>
                          <span>{pendingMaterialRequests} Solicitud(es) de Material</span>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {can('payments:view') && overduePayments.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-red-500">Pagos Vencidos</DropdownMenuLabel>
                        {overduePayments.map((p: SupplierPayment) => (
                          <Link key={p.id} href="/dashboard/payments">
                            <DropdownMenuItem className="text-red-500">
                              <AlertCircle className="mr-2 h-4 w-4"/>
                              <span>Factura {p.invoiceNumber} ({supplierMap.get(p.supplierId) || 'N/A'}) vencida.</span>
                            </DropdownMenuItem>
                          </Link>
                        ))}
                      </>
                    )}
                     {can('payments:view') && dueSoonPayments.length > 0 && (
                       <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-amber-500">Pagos por Vencer</DropdownMenuLabel>
                        {dueSoonPayments.map((p: SupplierPayment) => (
                          <Link key={p.id} href="/dashboard/payments">
                             <DropdownMenuItem className="text-amber-500">
                              <AlertCircle className="mr-2 h-4 w-4"/>
                              <span>Factura {p.invoiceNumber} ({supplierMap.get(p.supplierId) || 'N/A'}) vence en {differenceInDays(p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate as any), today)} días.</span>
                            </DropdownMenuItem>
                          </Link>
                        ))}
                       </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                  <p className="text-xs text-primary font-medium pt-1">{getRoleDisplayName(user.role)}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {user.role === 'super-admin' && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Cambiar Inquilino</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                           <DropdownMenuItem onSelect={() => setCurrentTenantId(null)}>
                              Ver Todos los Inquilinos
                          </DropdownMenuItem>
                          {(tenants || []).map((tenant: Tenant) => (
                              <DropdownMenuItem key={tenant.id} onSelect={() => setCurrentTenantId(tenant.tenantId)}>
                                  {tenant.name}
                              </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                 )}
                 <DropdownMenuItem asChild>
                   <Link href="/dashboard/profile">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                   </Link>
                 </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

           </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
