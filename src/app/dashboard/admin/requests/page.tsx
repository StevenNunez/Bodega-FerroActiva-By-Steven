
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
import { Check, Clock, X, Loader2, ClipboardList, Bell } from "lucide-react";
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

type Status = "pending" | "approved" | "rejected";

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
  items?: { materialId: string; quantity: number }[];
};

export default function ManageMaterialRequestsPage() {
  const { requests, updateMaterialRequestStatus, users, materials, isLoading, can } =
    useAppState();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [processingIds, setProcessingIds] = useState<string[]>([]);


  // Mapas para acceso rápido
  const materialMap = useMemo(
    () => new Map((materials || []).map((m: Material) => [m.id, m])),
    [materials]
  );
  const userMap = useMemo(
    () => new Map((users || []).map((u: User) => [u.id, u.name])),
    [users]
  );

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : (date as Date);
  };

  const sortedRequests = useMemo(() => {
    if (!requests) return [];
    return [...(requests as CompatibleMaterialRequest[])].sort((a,b) => {
        const dateA = getDate(a.createdAt)?.getTime() || 0;
        const dateB = getDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
    });
  }, [requests]);

  // Listas filtradas y ordenadas
  const pendingRequests = useMemo(() => sortedRequests.filter((req) => req.status === "pending"), [sortedRequests]);
  const approvedRequests = useMemo(() => sortedRequests.filter((req) => req.status === "approved"), [sortedRequests]);
  const rejectedRequests = useMemo(() => sortedRequests.filter((req) => req.status === "rejected"), [sortedRequests]);
  
  const visiblePendingRequests = useMemo(() => {
      return pendingRequests.filter(req => !processingIds.includes(req.id));
  }, [pendingRequests, processingIds]);


  const formatDate = (
    date: Date | Timestamp | null | undefined
  ): string => {
    const jsDate = getDate(date);
    return jsDate
      ? jsDate.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";
  };

  const handleStatusUpdate = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    setProcessingIds(prev => [...prev, requestId]);
    try {
      await updateMaterialRequestStatus(requestId, status);
      toast({
        title:
          status === "approved" ? "Solicitud Aprobada" : "Solicitud Rechazada",
        description:
          "El estado de la solicitud ha sido actualizado correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la solicitud.",
      });
    } finally {
        // En lugar de quitarlo solo en error, lo quitamos siempre para que la lista principal se actualice desde Firestore
        // Si no, el item queda oculto para siempre en esta sesión si la actualización fue exitosa.
        // La lista principal se re-renderizará via onSnapshot y el item ya no estará en `pendingRequests`.
    }
  };

  const filteredRequests = useMemo(() => {
    switch (activeTab) {
      case "approved":
        return approvedRequests;
      case "rejected":
        return rejectedRequests;
      default:
        // Mostramos la lista de pendientes que no se estén procesando
        return pendingRequests.filter(req => !processingIds.includes(req.id));
    }
  }, [activeTab, pendingRequests, approvedRequests, rejectedRequests, processingIds]);

  const renderRequestItems = (request: CompatibleMaterialRequest) => {
    const items =
      request.items && Array.isArray(request.items)
        ? request.items
        : request.materialId && request.quantity
        ? [{ materialId: request.materialId, quantity: request.quantity }]
        : [];

    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, index) => {
          const material = materialMap.get(item.materialId);
          return (
            <li key={index}>
              <span className="font-semibold">{item.quantity}</span>
              <span className="text-muted-foreground"> x </span>
              <span>{material?.name ?? "Material desconocido"}</span>
              {material?.unit && (
                <span className="text-muted-foreground text-xs">
                  {" "}
                  ({material.unit})
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="mr-1 h-3 w-3" /> Pendiente
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-600 text-white">
            <Check className="mr-1 h-3 w-3" /> Aprobado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" /> Rechazado
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestionar Solicitudes de Materiales"
        description="Aprueba o rechaza las solicitudes de material de los supervisores."
      />

      {/* Tarjeta de solicitudes pendientes rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Solicitudes de Materiales Pendientes</span>
            <Link href="/dashboard/admin/requests">
              <Button variant="outline" size="sm">
                <ClipboardList className="mr-2 h-4 w-4" /> Ver Todas
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>
            Revisa y aprueba las solicitudes pendientes para descontar del stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8 h-72 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 mb-2 animate-spin" />
              <p>Cargando solicitudes...</p>
            </div>
          ) : visiblePendingRequests.length > 0 ? (
            <ScrollArea className="h-72 border rounded-md">
              <ul className="p-4 space-y-4">
                {visiblePendingRequests.map(
                  (req: CompatibleMaterialRequest) => {
                    const supervisor = users?.find(
                      (u: User) => u.id === req.supervisorId
                    );
                    const isProcessing = processingIds.includes(req.id);
                    return (
                      <li
                        key={req.id}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 rounded-lg bg-secondary gap-4"
                      >
                        <div className="flex-grow space-y-2">
                           <div>
                            {(req.items || []).map((item) => {
                                const material = materialMap.get(item.materialId);
                                return (
                                  <div
                                    key={item.materialId}
                                    className="text-sm font-medium"
                                  >
                                    <span className="font-semibold">
                                      {material?.name ?? "N/A"}
                                    </span>{" "}
                                    <span className="text-primary">
                                      ({item.quantity} uds)
                                    </span>
                                  </div>
                                )
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Solicitado por: {supervisor?.name || "Desconocido"}{" "}
                            para {req.area}
                          </p>
                        </div>
                        
                        {can("material_requests:approve") && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>} Aprobar
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                    ¿Confirmar Aprobación?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Al confirmar, se descontará el stock de los
                                    materiales solicitados del inventario. Esta
                                    acción no se puede deshacer fácilmente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                    onClick={() =>
                                        handleStatusUpdate(req.id, "approved")
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                    >
                                    Sí, Confirmar y Descontar Stock
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </li>
                    );
                  }
                )}
              </ul>
            </ScrollArea>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8 h-72 flex flex-col items-center justify-center">
              <Bell className="h-10 w-10 mb-2" />
              <p>No hay solicitudes pendientes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial completo con pestañas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
          <CardDescription>
            Navega entre las pestañas para ver el historial de solicitudes por
            estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Status)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendientes ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprobadas ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rechazadas ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <ScrollArea className="h-[calc(80vh-18rem)]">
                <div className="space-y-4 pr-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredRequests.length > 0 ? (
                    (filteredRequests as CompatibleMaterialRequest[]).map(
                      (req: CompatibleMaterialRequest) => (
                        <div
                          key={req.id}
                          className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-4"
                        >
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Solicitante / Área
                              </p>
                              <p className="font-semibold">
                                {userMap.get(req.supervisorId) || "Desconocido"} /{" "}
                                <span className="font-normal">{req.area}</span>
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Materiales Solicitados
                              </p>
                              {renderRequestItems(req)}
                            </div>

                            <p className="text-xs text-muted-foreground font-mono pt-2">
                              Solicitado el: {formatDate(req.createdAt)}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            {activeTab === "pending" &&
                              can("material_requests:approve") && (
                                <>
                                  {/* Rechazar */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full sm:w-auto"
                                        disabled={processingIds.includes(req.id)}
                                      >
                                        <X className="mr-2 h-4 w-4" /> Rechazar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          ¿Confirmar Rechazo?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción marcará la solicitud como
                                          rechazada y no modificará el stock.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleStatusUpdate(req.id, "rejected")
                                          }
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Sí, Rechazar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  {/* Aprobar */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                                        disabled={processingIds.includes(req.id)}
                                      >
                                        {processingIds.includes(req.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />} Aprobar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          ¿Confirmar Aprobación?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Al confirmar, se descontará el stock de
                                          los materiales solicitados.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleStatusUpdate(req.id, "approved")
                                          }
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          Sí, Confirmar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}

                            {activeTab !== "pending" && getStatusBadge(req.status as Status)}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                      <p>No hay solicitudes en esta categoría.</p>
                    </div>
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
