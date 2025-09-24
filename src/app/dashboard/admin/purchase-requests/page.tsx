
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PurchaseRequest, PurchaseRequestStatus } from "@/lib/data";
import { Check, Clock, X, PackageCheck, Loader2, Box, FileText, Edit, AlertCircle } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EditPurchaseRequestForm } from "@/components/operations/edit-purchase-request-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function AdminPurchaseRequestsPage() {
  const { purchaseRequests, users, receivePurchaseRequest, isLoading } = useAppState();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseRequestStatus>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

  const supervisorMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return purchaseRequests;
    return purchaseRequests.filter((req) => req.status === statusFilter);
  }, [purchaseRequests, statusFilter]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const handleReceive = async (id: string) => {
    setUpdatingId(id);
    try {
      await receivePurchaseRequest(id);
      toast({
        title: "Stock Actualizado",
        description: "El material ha sido ingresado al inventario.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el stock.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

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
        title="Visualización de Solicitudes de Compra"
        description="Aquí puedes ver el estado de todas las solicitudes y gestionar el ingreso de materiales aprobados."
      />

      <Card className="!max-w-none">
        <CardHeader>
          <CardTitle>Historial de Solicitudes de Compra</CardTitle>
          <CardDescription>
            Puedes revisar, gestionar y registrar el ingreso de materiales a bodega.
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
                      <TableHead className="w-[150px]">Fecha Solicitud</TableHead>
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
                          <TableCell>{supervisorMap.get(req.supervisorId) ?? "N/A"}</TableCell>
                          <TableCell>{formatDate(req.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                             {req.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRequest(req)}
                                  aria-label={`Gestionar solicitud de compra para ${req.materialName}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Gestionar
                                </Button>
                             )}
                            {["approved", "batched", "ordered"].includes(req.status) && (
                                <Button
                                size="sm"
                                onClick={() => handleReceive(req.id)}
                                disabled={updatingId === req.id}
                                aria-label={`Recibir solicitud de compra ${req.materialName}`}
                                >
                                {updatingId === req.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                )}
                                Recibir
                                </Button>
                            )}
                            {req.status === "received" && (
                                <span className="text-xs text-green-500">Ingresado</span>
                            )}
                            {req.status === "rejected" && (
                                <span className="text-xs text-red-500">Rechazada</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )})
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
    </div>
  );
}
