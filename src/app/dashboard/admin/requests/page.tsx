
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/modules/core/hooks/use-toast";
import { Check, Clock, X, Loader2, ClipboardList, Bell, AlertTriangle } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type { MaterialRequest, Material, User } from "@/modules/core/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected";

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
  items?: { materialId: string; quantity: number }[];
};

const StatusBadge = ({ status }: { status: Status }) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white border-none"><Clock className="mr-1 h-3 w-3" /> Pendiente</Badge>;
    case "approved":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white border-none"><Check className="mr-1 h-3 w-3" /> Aprobado</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="border-none"><X className="mr-1 h-3 w-3" /> Rechazado</Badge>;
    default:
      return <Badge variant="outline">Desconocido</Badge>;
  }
};

const RequestItemsList = ({ req, materialMap }: { req: CompatibleMaterialRequest; materialMap: Map<string, Material> }) => {
  const items = req.items && Array.isArray(req.items)
    ? req.items
    : req.materialId && req.quantity
    ? [{ materialId: req.materialId, quantity: req.quantity }]
    : [];

  return (
    <ul className="list-disc list-inside space-y-1 text-sm mt-1">
      {items.map((item, index) => {
        const material = materialMap.get(item.materialId);
        const currentStock = material?.stock || 0;
        const isInsufficient = req.status === 'pending' && currentStock < item.quantity;

        return (
          <li key={index} className="flex items-center gap-2">
            <span className="font-semibold">{item.quantity}</span>
            <span className="text-muted-foreground">x</span>
            <span className={cn("font-medium", isInsufficient ? "text-destructive" : "text-foreground")}>
              {material?.name ?? "Material desconocido"}
            </span>
            {material?.unit && <span className="text-xs text-muted-foreground">({material.unit})</span>}
            {isInsufficient && (
               <Badge variant="destructive" className="text-[10px] h-5 px-1 ml-2">
                 Stock insuficiente: {currentStock}
               </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
};


export default function ManageMaterialRequestsPage() {
  const { requests, updateMaterialRequestStatus, users, materials, isLoading, can } = useAppState();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  const materialMap = useMemo(() => new Map((materials || []).map((m: Material) => [m.id, m])), [materials]);
  const userMap = useMemo(() => new Map((users || []).map((u: User) => [u.id, u.name])), [users]);

  const getDate = (date: any): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : (date as Date);
  };

  const sortedRequests = useMemo(() => {
    if (!requests) return [];
    return [...(requests as CompatibleMaterialRequest[])].sort((a, b) => {
      const dateA = getDate(a.createdAt)?.getTime() || 0;
      const dateB = getDate(b.createdAt)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [requests]);

  const pendingRequests = useMemo(() => sortedRequests.filter((req) => req.status === "pending"), [sortedRequests]);
  const approvedRequests = useMemo(() => sortedRequests.filter((req) => req.status === "approved"), [sortedRequests]);
  const rejectedRequests = useMemo(() => sortedRequests.filter((req) => req.status === "rejected"), [sortedRequests]);

  const visiblePendingRequests = useMemo(() => pendingRequests.filter(req => !processingIds.includes(req.id)), [pendingRequests, processingIds]);

  const filteredRequests = useMemo(() => {
    switch (activeTab) {
      case "approved": return approvedRequests;
      case "rejected": return rejectedRequests;
      default: return visiblePendingRequests;
    }
  }, [activeTab, approvedRequests, rejectedRequests, visiblePendingRequests]);

  const formatDate = (date: any): string => {
    const jsDate = getDate(date);
    return jsDate ? jsDate.toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "N/A";
  };

  const handleStatusUpdate = async (requestId: string, status: "approved" | "rejected") => {
    setProcessingIds(prev => [...prev, requestId]);

    try {
      if (status === "approved") {
        const request = sortedRequests.find(r => r.id === requestId);
        if (request) {
          const items = request.items || (request.materialId ? [{ materialId: request.materialId, quantity: request.quantity || 0 }] : []);
          const insufficientItems = items.filter(item => {
             const mat = materialMap.get(item.materialId);
             return !mat || mat.stock < item.quantity;
          });

          if (insufficientItems.length > 0) {
             throw new Error(`Stock insuficiente para ${insufficientItems.length} ítem(s). Revisa el inventario.`);
          }
        }
      }

      await updateMaterialRequestStatus(requestId, status);
      toast({
        title: status === "approved" ? "¡Solicitud Aprobada!" : "Solicitud Rechazada",
        description: status === "approved" ? "El stock ha sido descontado correctamente." : "No se realizaron cambios en el inventario.",
        variant: status === "approved" ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No se pudo procesar",
        description: error.message || "Ocurrió un error inesperado.",
      });
      setProcessingIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const QuickPendingItem = ({ req }: { req: CompatibleMaterialRequest }) => {
    const supervisor = userMap.get(req.supervisorId);
    const isProcessing = processingIds.includes(req.id);
    return (
      <li className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 rounded-xl bg-card border shadow-sm gap-4 transition-shadow hover:shadow-md">
        <div className="flex-grow space-y-2">
          <div className="flex justify-between items-start">
             <RequestItemsList req={req} materialMap={materialMap} />
             <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">{formatDate(req.createdAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
             <span className="font-medium text-foreground">{supervisor || "Desconocido"}</span> • {req.area}
          </p>
        </div>
        
        {can("material_requests:approve") && (
          <div className="flex gap-2 shrink-0">
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2" disabled={isProcessing}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rechazar Solicitud</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción es irreversible. ¿Deseas continuar?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusUpdate(req.id, "rejected")} className="bg-destructive hover:bg-destructive/90">Rechazar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : "Aprobar"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                  <AlertDialogDescription>Se descontarán los materiales del inventario automáticamente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusUpdate(req.id, "approved")} className="bg-green-600 hover:bg-green-700">Confirmar y Descontar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </li>
    );
  };
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Solicitudes de Materiales"
        description="Aprueba o rechaza las solicitudes de material de los supervisores."
      />

      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
               <Bell className="h-5 w-5 text-primary" /> Pendientes de Revisión ({pendingRequests.length})
            </span>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('pending')} className="hidden sm:flex">
              <ClipboardList className="mr-2 h-4 w-4" /> Ver Historial Completo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : visiblePendingRequests.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <ul className="space-y-3 pt-2">
                {visiblePendingRequests.map((req) => (
                  <QuickPendingItem key={req.id} req={req} />
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
              <Check className="h-10 w-10 mb-2 text-green-500 opacity-50" />
              <p>¡Todo al día! No hay solicitudes pendientes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
          <CardDescription>
            Navega entre las pestañas para ver el historial de solicitudes por
            estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 p-1 bg-muted rounded-lg">
              <TabsTrigger value="pending" className="rounded-md data-[state=active]:bg-card data-[state=active]:text-yellow-600 data-[state=active]:shadow-sm">
                 Pendientes
              </TabsTrigger>
              <TabsTrigger value="approved" className="rounded-md data-[state=active]:bg-card data-[state=active]:text-green-600 data-[state=active]:shadow-sm">
                 Aprobadas
              </TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-md data-[state=active]:bg-card data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                 Rechazadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-2">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                      <div key={req.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
                        <div className="space-y-2 w-full">
                           <div className="flex items-center gap-2">
                              <StatusBadge status={req.status as Status} />
                              <span className="text-xs font-mono text-muted-foreground">{formatDate(req.createdAt)}</span>
                           </div>
                           <div>
                              <p className="text-sm text-muted-foreground">Solicitante: <span className="font-medium text-foreground">{userMap.get(req.supervisorId)}</span></p>
                              <p className="text-sm text-muted-foreground">Área: <span className="font-medium text-foreground">{req.area}</span></p>
                           </div>
                           <div className="bg-muted/40 p-3 rounded-md">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Detalle:</p>
                              <RequestItemsList req={req} materialMap={materialMap} />
                           </div>
                        </div>
                        
                        {activeTab === 'pending' && can("material_requests:approve") && !processingIds.includes(req.id) && (
                           <div className="flex flex-col gap-2 justify-center sm:border-l sm:pl-4 sm:border-border sm:w-32 min-w-[120px]">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full text-white" onClick={() => handleStatusUpdate(req.id, "approved")}>Aprobar</Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive w-full" onClick={() => handleStatusUpdate(req.id, "rejected")}>Rechazar</Button>
                           </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No hay registros en esta categoría.</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    