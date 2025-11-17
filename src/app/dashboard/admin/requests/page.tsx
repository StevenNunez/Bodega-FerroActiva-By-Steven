"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/modules/core/hooks/use-toast";
import { Check, Clock, X, Loader2, ClipboardList, Bell } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type { MaterialRequest, Material, User } from "@/modules/core/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { requests, updateMaterialRequestStatus, users, materials, isLoading, can } = useAppState();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");

  // Mapas con tipos explícitos
  const materialMap = useMemo(() => {
    return new Map<string, Material>((materials || []).map((m: Material) => [m.id, m]));
  }, [materials]);

  const userMap = useMemo(() => {
    return new Map<string, string>((users || []).map((u: User) => [u.id, u.name]));
  }, [users]);

  // Pendientes: orden por fecha más reciente primero
  const pendingRequests = useMemo(() => {
    return (requests || [])
      .filter((req: MaterialRequest): req is MaterialRequest => req.status === "pending")
      .sort((a: MaterialRequest, b: MaterialRequest) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
  }, [requests]);

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
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

  const handleStatusUpdate = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await updateMaterialRequestStatus(requestId, status);
      toast({
        title: status === "approved" ? "Solicitud Aprobada" : "Solicitud Rechazada",
        description: "El estado ha sido actualizado correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la solicitud.",
      });
    }
  };

  const filteredRequests = useMemo(() => {
    return (requests || [])
      .filter((req: MaterialRequest): req is MaterialRequest => req.status === activeTab)
      .sort((a: MaterialRequest, b: MaterialRequest) => {
        const dateA = getDate(a.createdAt)?.getTime() || 0;
        const dateB = getDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });
  }, [requests, activeTab]);

  const renderRequestItems = (request: CompatibleMaterialRequest) => {
    const items = request.items || (request.materialId ? [{ materialId: request.materialId, quantity: request.quantity || 0 }] : []);
    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, index) => {
          const material = materialMap.get(item.materialId);
          return (
            <li key={index}>
              <span className="font-semibold">{item.quantity}</span>
              <span className="text-muted-foreground"> x </span>
              <span>{material?.name || "Material desconocido"}</span>
              {material && <span className="text-muted-foreground text-xs"> ({material.unit})</span>}
            </li>
          );
        })}
      </ul>
    );
  };

  const getStatusBadge = (status: Status): React.ReactNode => {
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

      {/* Solicitudes Pendientes */}
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
          <CardDescription>Revisa y aprueba las solicitudes pendientes para descontar del stock.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 h-72 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 mb-2 animate-spin" />
              <p className="text-muted-foreground">Cargando solicitudes...</p>
            </div>
          ) : pendingRequests.length > 0 ? (
            <ScrollArea className="h-72 border rounded-md">
              <ul className="p-4 space-y-4">
                {(pendingRequests as CompatibleMaterialRequest[]).map((req: CompatibleMaterialRequest) => {
                  const supervisorName = userMap.get(req.supervisorId) || "Desconocido";
                  return (
                    <li
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 rounded-lg bg-secondary gap-4"
                    >
                      <div className="flex-grow space-y-2">
                        <div>
                          {req.items && Array.isArray(req.items) ? (
                            req.items.map((item) => {
                              const material = materialMap.get(item.materialId);
                              return (
                                <div key={item.materialId} className="text-sm font-medium">
                                  <span className="font-semibold">{material?.name || "N/A"}</span>{" "}
                                  <span className="text-primary">({item.quantity} uds)</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm font-medium">
                              <span className="font-semibold">
                                {materialMap.get(req.materialId || "")?.name || "N/A"}
                              </span>{" "}
                              <span className="text-primary">({req.quantity} uds)</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Solicitado por: {supervisorName} para {req.area}
                        </p>
                      </div>

                      {can("material_requests:approve") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="w-full sm:w-auto">
                              Aprobar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar Aprobación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se descontará el stock de los materiales solicitados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusUpdate(req.id, "approved")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Sí, Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 h-72 flex flex-col items-center justify-center">
              <Bell className="h-10 w-10 mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No hay solicitudes pendientes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
          <CardDescription>Navega entre las pestañas para ver el historial por estado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Status)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendientes ({requests?.filter((r: MaterialRequest) => r.status === "pending").length || 0})
              </TabsTrigger>
              <TabsTrigger value="approved">Aprobadas</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[calc(80vh-18rem)]">
                <div className="space-y-4 pr-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredRequests.length > 0 ? (
                    (filteredRequests as CompatibleMaterialRequest[]).map((req: CompatibleMaterialRequest) => (
                      <div
                        key={req.id}
                        className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-4"
                      >
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Solicitante / Área</p>
                            <p className="font-semibold">
                              {userMap.get(req.supervisorId) || "Desconocido"} / <span className="font-normal">{req.area}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Materiales Solicitados</p>
                            {renderRequestItems(req)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono pt-2">
                            Solicitado el: {formatDate(req.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                          {activeTab === "pending" && can("material_requests:approve") && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="w-full">
                                    <X className="mr-2 h-4 w-4" /> Rechazar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar Rechazo?</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleStatusUpdate(req.id, "rejected")}
                                      className="bg-destructive"
                                    >
                                      Sí, Rechazar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                                    <Check className="mr-2 h-4 w-4" /> Aprobar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar Aprobación?</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleStatusUpdate(req.id, "approved")}
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
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
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