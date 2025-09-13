"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAppState } from "@/contexts/app-provider";
import { Sidebar } from "@/components/sidebar";
import { Menu, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const { requests, purchaseRequests } = useAppState();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Solicitudes pendientes
  const pendingMaterialRequests = React.useMemo(() => {
    return (requests || []).filter((r) => r.status === "pending").length;
  }, [requests]);

  const pendingPurchaseRequests = React.useMemo(() => {
    return (purchaseRequests || []).filter((pr) => pr.status === "pending").length;
  }, [purchaseRequests]);

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

          {/* Notificación visual */}
          {(user?.role === "admin" || user?.role === "operations") && pendingCount > 0 && (
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
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
