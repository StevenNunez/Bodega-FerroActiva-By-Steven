"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PurchaseRequest, PurchaseRequestStatus } from "@/lib/data";
import { Check, Clock, X, Edit, ShoppingCart, Wrench, PackageCheck, AlertTriangle, TrendingUp, PackageSearch, PackageOpen, Box, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { EditPurchaseRequestForm } from "@/components/operations/edit-purchase-request-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function OperationsPage() {
  const { purchaseRequests, users, updatePurchaseRequestStatus, requests, tools, materials, toolLogs, isLoading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseRequestStatus>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = getDate(date);
    if (!jsDate) return "N/A";
    return jsDate.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const supervisorMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return purchaseRequests;
    return purchaseRequests.filter((r) => r.status === statusFilter);
  }, [purchaseRequests, statusFilter]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const pendingPurchaseRequests = useMemo(() => purchaseRequests.filter((r) => r.status === "pending"), [purchaseRequests]);
  const lowStockMaterials = useMemo(() => materials.filter((m) => m.stock < 100), [materials]);
  const checkedOutTools = useMemo(() => toolLogs.filter((log) => log.returnDate === null), [toolLogs]);

  const mostUsedMaterials = useMemo(() => {
    const usage = requests
      .filter((r) => r.status === "approved")
      .reduce((acc, req) => {
        acc[req.materialId] = (acc[req.materialId] || 0) + req.quantity;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([materialId, quantity]) => ({
        name: materialMap.get(materialId)?.name ?? "Desconocido",
        quantity,
      }));
  }, [requests, materialMap]);

  const recentApprovedRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === "approved")
      .sort((a, b) => {
        const dateA = getDate(a.createdAt);
        const dateB = getDate(b.createdAt);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [requests]);

  const getStatusBadge = useMemo(
    () => (status: PurchaseRequestStatus) => {
      switch (status) {
        case "pending":
          return (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <Clock className="mr-1 h-3 w-3" />
              Pendiente
            </Badge>
          );
        case "approved":
          return (
            <Badge variant="default" className="bg-green-600 text-white">
              <Check className="mr-1 h-3 w-3" />
              Aprobado
            </Badge>
          );
        case "rejected":
          return (
            <Badge variant="destructive">
              <X className="mr-1 h-3 w-3" />
              Rechazado
            </Badge>
          );
        case "received":
          return (
            <Badge variant="default" className="bg-blue-600 text-white">
              <PackageCheck className="mr-1 h-3 w-3" />
              Recibido
            </Badge>
          );
        case "batched":
          return (
            <Badge variant="default" className="bg-purple-600 text-white">
              <Box className="mr-1 h-3 w-3" />
              En Lote
            </Badge>
          );
        case "ordered":
          return (
            <Badge variant="default" className="bg-cyan-600 text-white">
              <FileText className="mr-1 h-3 w-3" />
              Orden Generada
            </Badge>
          );
        default:
          return <Badge variant="outline">Desconocido</Badge>;
      }
    },
    []
  );

  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
      return `Cantidad original: ${req.originalQuantity}. ${req.notes || "Sin notas adicionales."}`;
    }
    if (req.notes) {
      return req.notes;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      {editingRequest && (
        <EditPurchaseRequestForm
          request={editingRequest}
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}

      <PageHeader
        title={`Bienvenido, ${authUser?.name ?? "Usuario"}`}
        description="Gestiona las solicitudes de compra y supervisa el estado general de la operación."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Compra Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPurchaseRequests.length}</div>
            <p className="text-xs text-muted-foreground">Esperando tu aprobación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Materiales</CardTitle>
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-xs text-muted-foreground">En inventario total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Herramientas en Uso</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedOutTools.length}</div>
            <p className="text-xs text-muted-foreground">Fuera de bodega actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Stock</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter((r) => r.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Pendientes en bodega</p>
          </CardContent>
        </Card>
      </div>

      <Card className="!max-w-none">
        <CardHeader>
          <CardTitle>Gestión de Solicitudes de Compra</CardTitle>
          <CardDescription>
            Aquí se listan todas las solicitudes de compra de materiales para su futura adquisición.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            <div className="w-[180px]">
              <Label htmlFor="status-filter">Filtrar por estado</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as "all" | PurchaseRequestStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status-filter" aria-describedby="status-filter-description">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                  <SelectItem value="received">Recibido</SelectItem>
                  <SelectItem value="batched">En Lote</SelectItem>
                  <SelectItem value="ordered">Orden Generada</SelectItem>
                </SelectContent>
              </Select>
              <span id="status-filter-description" className="sr-only">
                Filtra solicitudes de compra por estado
              </span>
            </div>
            <div className="relative overflow-x-auto max-w-full">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-[200px]">Material</TableHead>
                      <TableHead className="w-[150px]">Cantidad</TableHead>
                      <TableHead className="w-[200px]">Justificación</TableHead>
                      <TableHead className="w-[150px]">Solicitante</TableHead>
                      <TableHead className="w-[150px]">Fecha</TableHead>
                      <TableHead className="w-[150px]">Estado</TableHead>
                      <TableHead className="w-[150px] text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length > 0 ? (
                      paginatedRequests.map((req) => {
                        const supervisor = supervisorMap.get(req.supervisorId) ?? "N/A";
                        const changeTooltip = getChangeTooltip(req);
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{req.materialName}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              {req.quantity} {req.unit}
                              {changeTooltip && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{changeTooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {req.justification ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-pointer">{req.justification}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{req.justification}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell>{supervisor}</TableCell>
                            <TableCell>{formatDate(req.createdAt)}</TableCell>
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="text-right">
                              {req.status === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRequest(req)}
                                  aria-label={`Gestionar solicitud de compra para ${req.materialName}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Gestionar
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Gestionada</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No hay solicitudes de compra para el estado seleccionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  aria-label="Página anterior de solicitudes"
                >
                  Anterior
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  aria-label="Página siguiente de solicitudes"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle /> Materiales con Bajo Stock
            </CardTitle>
            <CardDescription>Materiales con menos de 100 unidades disponibles. Prioridad de compra.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              {lowStockMaterials.length > 0 ? (
                <ul className="space-y-3 pr-2">
                  {lowStockMaterials.map((mat) => (
                    <li
                      key={mat.id}
                      className="flex justify-between items-center text-sm p-2 rounded-md border border-amber-500/20"
                      role="listitem"
                    >
                      <span className="truncate">{mat.name}</span>
                      <span className="font-bold text-amber-500">{mat.stock}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                  <PackageSearch className="h-10 w-10 mb-2" />
                  <p>No hay materiales con bajo stock.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp /> Materiales Más Solicitados
            </CardTitle>
            <CardDescription>Top 5 materiales más pedidos de la bodega.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              {mostUsedMaterials.length > 0 ? (
                <ul className="space-y-3">
                  {mostUsedMaterials.map((item, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50"
                      role="listitem"
                    >
                      <span className="font-medium truncate pr-2">{item.name}</span>
                      <span className="font-mono text-primary font-semibold">{item.quantity.toLocaleString()} uds</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                  <PackageSearch className="h-10 w-10 mb-2" />
                  <p>No hay datos de uso aún.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen /> Últimas Salidas de Bodega
            </CardTitle>
            <CardDescription>Las 5 solicitudes de material más recientes que fueron aprobadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              {recentApprovedRequests.length > 0 ? (
                <ul className="space-y-3">
                  {recentApprovedRequests.map((req) => (
                    <li
                      key={req.id}
                      className="text-sm p-2 rounded-md bg-muted/50"
                      role="listitem"
                    >
                      <p className="font-semibold">
                        {materialMap.get(req.materialId)?.name ?? "N/A"}{" "}
                        <span className="font-normal text-primary">({req.quantity} uds)</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Para: {req.area} (Solicitado por {supervisorMap.get(req.supervisorId) ?? "N/A"})
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                  <PackageSearch className="h-10 w-10 mb-2" />
                  <p>No hay salidas recientes.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}