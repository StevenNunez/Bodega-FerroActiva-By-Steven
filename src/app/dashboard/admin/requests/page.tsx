"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
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

  // Mapas seguros y con tipado explícito
  const materialMap = useMemo(() => {
    const map = new Map<string, Material>();
    (materials || []).forEach((m: Material) => {
      map.set(m.id, m);
    });
    return map;
  }, [materials]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: User) => {
      map.set(u.id, u.name);
    });
    return map;
  }, [users]);

  const toDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : (date as Date);
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = toDate(date);
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

  // Filtros con tipado correcto
  const pendingRequests = useMemo(() => {
    return (requests || [])
      .filter((req: any): req is MaterialRequest => req?.status === "pending")
      .sort((a: MaterialRequest, b: MaterialRequest) => {
        const aTime = toDate(a.createdAt)?.getTime() || 0;
        const bTime = toDate(b.createdAt)?.getTime() || 0;
        return aTime - bTime;
      });
  }, [requests]);

  const approvedRequests = useMemo(() => {
    return (requests || [])
      .filter((req: any): req is MaterialRequest => req?.status === "approved")
      .sort((a: MaterialRequest, b: MaterialRequest) => {
        const aTime = toDate(a.createdAt)?.getTime() || 0;
        const bTime = toDate(b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [requests]);

  const rejectedRequests = useMemo(() => {
    return (requests || [])
      .filter((req: any): req is MaterialRequest => req?.status === "rejected")
      .sort((a: MaterialRequest, b: MaterialRequest) => {
        const aTime = toDate(a.createdAt)?.getTime() || 0;
        const bTime = toDate(b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [requests]);

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
    switch (activeTab) {
      case "approved":
        return approvedRequests;
      case "rejected":
        return rejectedRequests;
      default:
        return pendingRequests;
    }
  }, [activeTab, pendingRequests, approvedRequests, rejectedRequests]);

  // Renderizado seguro
  const renderRequestItems = (request: CompatibleMaterialRequest) => {
    const items =
      request.items && Array.isArray(request.items)
        ? request.items
        : request.materialId && request.quantity !== undefined
        ? [{ materialId: request.materialId, quantity: request.quantity }]
        : [];

    if (items.length === 0) {
      return <span className="text-sm text-muted-foreground">Sin items</span>;
    }

    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item: { materialId: string; quantity: number }, index: number) => {
          const material = materialMap.get(item.materialId);
          return (
            <li key={index}>
              <span className="font-semibold">{item.quantity}</span>
              <span className="text-muted-foreground"> × </span>
              <span>{material?.name ?? "Material desconocido"}</span>
              {material?.unit && (
                <span className="text-muted-foreground text-xs">
                  {" "}({material.unit})
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

      {/* Pendientes rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Solicitudes Pendientes</span>
            <Link href="/dashboard/admin/requests">
              <Button variant="outline" size="sm">
                <ClipboardList className="mr-2 h-4 w-4" /> Ver Todas
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>
            Revisa y aprueba las solicitudes pendientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-2" />
              <p>Cargando...</p>
            </div>
          ) : pendingRequests.length > 0 ? (
            <ScrollArea className="h-72 border rounded-md">
              <ul className="p-4 space-y-4">
                {pendingRequests.map((req: MaterialRequest) => {
                  const supervisorName = userMap.get(req.supervisorId) || "Desconocido";

                  return (
                    <li
                      key={req.id}
                      className="flex flex-col sm:flex-row justify-between items-start p-4 rounded-lg bg-secondary gap-4"
                    >
                      <div className="flex-1 space-y-2">
                        {(req as CompatibleMaterialRequest).items?.map((item: { materialId: string; quantity: number }) => {
                          const mat = materialMap.get(item.materialId);
                          return (
                            <div key={item.materialId} className="text-sm font-medium">
                              <span className="font-semibold">{mat?.name ?? "Desconocido"}</span>{" "}
                              <span className="text-primary">({item.quantity} uds)</span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground">
                          Por: {supervisorName} • Área: {req.area}
                        </p>
                      </div>

                      {can("material_requests:approve") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Check className="mr-2 h-4 w-4" /> Aprobar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Aprobar solicitud?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se descontará el stock automáticamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusUpdate(req.id, "approved")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Sí, Aprobar
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
            <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2" />
              <p>No hay solicitudes pendientes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pendientes ({pendingRequests.length})</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas ({approvedRequests.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas ({rejectedRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <ScrollArea className="h-[calc(80vh-20rem)]">
                <div className="space-y-4 pr-4">
                  {filteredRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      No hay solicitudes en esta categoría.
                    </p>
                  ) : (
                    filteredRequests.map((req: MaterialRequest) => (
                      <div
                        key={req.id}
                        className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4"
                      >
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Solicitante / Área</p>
                            <p className="font-semibold">
                              {userMap.get(req.supervisorId) || "Desconocido"} / {req.area}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Materiales</p>
                            {renderRequestItems(req as CompatibleMaterialRequest)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatDate(req.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:w-48">
                          {activeTab === "pending" && can("material_requests:approve") && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <X className="mr-2 h-4 w-4" /> Rechazar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Rechazar?</AlertDialogTitle>
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
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Check className="mr-2 h-4 w-4" /> Aprobar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Aprobar?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se descontará el stock.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleStatusUpdate(req.id, "approved")}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Sí, Aprobar
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