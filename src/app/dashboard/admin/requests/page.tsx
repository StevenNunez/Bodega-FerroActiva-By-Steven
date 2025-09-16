"use client";

import React, { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Clock, X, Send, Loader2, ChevronsUpDown, Package, Plus, Trash2, Filter, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Material, MaterialRequest } from "@/lib/data";

interface CartItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  stock: number;
}

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
};

export default function AdminRequestsPage() {
  const { requests, materials, users, approveRequest, addRequest, loading, notify } = useAppState();
  const { user: authUser } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") return requests;
    return requests.filter((req) => req.status === filterStatus);
  }, [requests, filterStatus]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      if (authUser?.role !== "admin") {
        notify("Solo los administradores pueden aprobar solicitudes.", "destructive");
        return;
      }
      const req = requests.find((r) => r.id === requestId) as CompatibleMaterialRequest;
      if (req) {
        const items = req.items && Array.isArray(req.items) ? req.items : [{ materialId: req.materialId, quantity: req.quantity }];
        for (const item of items) {
          const material = materialMap.get(item.materialId || "");
          if (!material || material.stock < (item.quantity || 0)) {
            notify(`Stock insuficiente para ${material?.name || "material"}.`, "destructive");
            return;
          }
        }
      }
      setApprovingRequestId(requestId);
      setShowConfirmDialog(true);
    },
    [authUser, requests, materialMap, notify]
  );

  const confirmApprove = useCallback(async () => {
    if (!approvingRequestId) return;
    setIsSubmitting(true);
    try {
      await approveRequest(approvingRequestId);
      notify("Solicitud aprobada exitosamente.", "success");
    } catch (error: any) {
      notify("Error al aprobar solicitud: " + (error?.message || "No se pudo completar la acción."), "destructive");
    } finally {
      setIsSubmitting(false);
      setApprovingRequestId(null);
      setShowConfirmDialog(false);
    }
  }, [approvingRequestId, approveRequest, notify]);

  const handleAddItemToCart = useCallback(() => {
    if (!currentMaterialId || !currentQuantity) {
      notify("Selecciona un material y una cantidad.", "destructive");
      return;
    }
    const material = materialMap.get(currentMaterialId);
    if (!material) {
      notify("Material no encontrado.", "destructive");
      return;
    }
    const quantity = Number(currentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      notify("La cantidad debe ser un número positivo.", "destructive");
      return;
    }
    if (quantity > material.stock) {
      notify(`Solo hay ${material.stock.toLocaleString()} unidades disponibles.`, "destructive");
      return;
    }
    if (cart.some((item) => item.materialId === currentMaterialId)) {
      notify("Este material ya está en la solicitud.", "destructive");
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        materialId: material.id,
        materialName: material.name,
        quantity,
        unit: material.unit,
        stock: material.stock,
      },
    ]);
    setCurrentMaterialId(null);
    setCurrentQuantity("");
    setPopoverOpen(false);
  }, [currentMaterialId, currentQuantity, cart, materialMap, notify]);

  const handleRemoveItemFromCart = useCallback((materialId: string) => {
    setCart((prev) => prev.filter((item) => item.materialId !== materialId));
  }, []);

  const handleRequestSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (cart.length === 0 || !area || !authUser) {
        notify("Añade al menos un material y una justificación.", "destructive");
        return;
      }
      if (authUser.role !== "admin") {
        notify("Solo los administradores pueden registrar salidas.", "destructive");
        return;
      }

      setIsSubmitting(true);
      try {
        await addRequest({
          items: cart.map(({ materialId, quantity }) => ({ materialId, quantity })),
          area,
          supervisorId: authUser.id,
        });
        notify("Solicitud enviada para aprobación.", "success");
        setCart([]);
        setArea("");
      } catch (error: any) {
        notify("Error al enviar solicitud: " + (error.message || "No se pudo enviar la solicitud."), "destructive");
      } finally {
        setIsSubmitting(false);
      }
    },
    [cart, area, authUser, addRequest, notify]
  );

  const getStatusBadge = useCallback((status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
            Pendiente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <Check className="mr-1 h-3 w-3" aria-hidden="true" />
            Aprobado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" aria-hidden="true" />
            Rechazado
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  }, []);

  const getDate = useCallback((date: Date | Timestamp | undefined) => {
    if (!date) return "N/A";
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilterStatus("all");
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="alert" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando datos...</span>
      </div>
    );
  }

  const availableMaterials = materials.filter((m) => m.stock > 0 && !cart.some((item) => item.materialId === m.id));

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 max-w-full overflow-x-hidden box-sizing-border-box">
      <PageHeader
        title="Gestión de Solicitudes de Materiales"
        description="Revisa y aprueba las solicitudes, o crea una nueva para justificar salidas de bodega."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <Card className="max-w-full min-w-0 overflow-x-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" aria-hidden="true" />
                Registrar Salida de Bodega
              </CardTitle>
              <CardDescription>Crea una solicitud con uno o más materiales para registrar su salida.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-6">
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                  <h4 className="font-medium text-center">Añadir Material a la Solicitud</h4>
                  {availableMaterials.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">No hay materiales disponibles.</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-label="Seleccionar material"
                          className="w-full justify-between truncate"
                          disabled={isSubmitting || availableMaterials.length === 0}
                        >
                          <span className="truncate">
                            {currentMaterialId ? materialMap.get(currentMaterialId)?.name : "Selecciona un material..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar material..." />
                          <CommandList>
                            <CommandEmpty>No se encontró el material.</CommandEmpty>
                            <CommandGroup>
                              {availableMaterials.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={m.name}
                                  onSelect={() => {
                                    setCurrentMaterialId(m.id);
                                    setPopoverOpen(false);
                                  }}
                                  className="flex justify-between"
                                >
                                  <div className="flex items-center truncate">
                                    <Check
                                      className={cn("mr-2 h-4 w-4", currentMaterialId === m.id ? "opacity-100" : "opacity-0")}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">{m.name}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Stock: {m.stock.toLocaleString()}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Ej: 10"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                      disabled={isSubmitting || !currentMaterialId}
                      aria-describedby="quantity-error"
                    />
                    <span id="quantity-error" className="sr-only">
                      Ingresa una cantidad válida mayor que 0.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleAddItemToCart}
                    disabled={isSubmitting || !currentMaterialId || !currentQuantity}
                    aria-label="Añadir material a la solicitud"
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Añadir a la Solicitud
                  </Button>
                </div>

                {cart.length > 0 && (
                  <div className="space-y-2">
                    <Label>Materiales en la Solicitud</Label>
                    <ScrollArea
                      className="h-40 w-full rounded-md border p-2 max-w-full"
                      role="region"
                      aria-label="Lista de materiales en la solicitud"
                    >
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div key={item.materialId} className="flex items-center justify-between bg-muted p-2 rounded-md">
                            <div className="max-w-[70%]">
                              <p className="text-sm font-medium truncate">{item.materialName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRemoveItemFromCart(item.materialId)}
                              aria-label={`Eliminar ${item.materialName} de la solicitud`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="area">Área / Justificación General</Label>
                  <Input
                    id="area"
                    placeholder="Ej: Reparaciones varias en taller"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={isSubmitting}
                    aria-describedby="area-error"
                  />
                  <span id="area-error" className="sr-only">
                    Ingresa una justificación válida para la solicitud.
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || cart.length === 0}
                  aria-label={`Registrar salida con ${cart.length} ítems`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Registrando...
                    </>
                  ) : (
                    `Registrar Salida (${cart.length} Ítems)`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="max-w-full min-w-0 overflow-x-hidden">
            <CardHeader>
              <CardTitle>Historial de Solicitudes</CardTitle>
              <CardDescription>
                Aquí se listan todas las solicitudes de materiales, tanto las pendientes como las ya gestionadas.
              </CardDescription>
              <div className="flex justify-end mt-2 gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]" aria-label="Filtrar por estado">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
                {filterStatus !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFilter}
                    aria-label="Limpiar filtro de estado"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-w-full">
              <ScrollArea
                className="h-[calc(80vh-15rem)] max-w-full"
                role="region"
                aria-label="Historial de solicitudes de materiales"
              >
                <div className="p-6 max-w-full min-w-0 overflow-x-hidden">
                  <Table
                    role="grid"
                    aria-label="Historial de solicitudes"
                    className="table-fixed w-full"
                    data-testid="requests-table"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%]">Ítems</TableHead>
                        <TableHead className="w-[20%]">Área/Proyecto</TableHead>
                        <TableHead className="w-[20%]">Solicitante</TableHead>
                        <TableHead className="w-[15%]">Fecha</TableHead>
                        <TableHead className="w-[10%]">Estado</TableHead>
                        <TableHead className="w-[10%] text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length > 0 ? (
                        (filteredRequests as CompatibleMaterialRequest[]).map((req) => (
                          <TableRow key={req.id} data-testid={`request-row-${req.id}`}>
                            <TableCell
                              className="font-medium max-w-[25%] overflow-hidden align-top"
                              data-testid="items-cell"
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <ul className="list-disc list-inside word-break-break-word max-w-full">
                                      {req.items && Array.isArray(req.items) ? (
                                        req.items.slice(0, 2).map((item) => (
                                          <li key={item.materialId} className="text-xs truncate">
                                            {item.quantity}x{" "}
                                            {materialMap.get(item.materialId)?.name || "Material no encontrado"}
                                          </li>
                                        ))
                                      ) : (
                                        <li className="text-xs truncate">
                                          {(req.quantity || 0)}x{" "}
                                          {materialMap.get(req.materialId || "")?.name || "Material no encontrado"}
                                        </li>
                                      )}
                                      {req.items && Array.isArray(req.items) && req.items.length > 2 && (
                                        <li className="text-xs text-muted-foreground">+{req.items.length - 2} más</li>
                                      )}
                                    </ul>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <ul className="list-disc list-inside">
                                      {req.items && Array.isArray(req.items)
                                        ? req.items.map((item) => (
                                            <li key={item.materialId}>
                                              {item.quantity}x {materialMap.get(item.materialId)?.name || "N/A"}
                                            </li>
                                          ))
                                        : `${req.quantity || 0}x ${
                                            materialMap.get(req.materialId || "")?.name || "N/A"
                                          }`}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="max-w-[20%] word-break-break-word overflow-hidden">
                              {req.area || "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[20%] truncate">
                              {userMap.get(req.supervisorId) || "Usuario no encontrado"}
                            </TableCell>
                            <TableCell className="max-w-[15%]">{getDate(req.createdAt)}</TableCell>
                            <TableCell className="max-w-[10%]">{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="text-right max-w-[10%]">
                              {req.status === "pending" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(req.id)}
                                  disabled={isSubmitting && approvingRequestId === req.id}
                                  aria-label={`Aprobar solicitud ${req.id}`}
                                >
                                  {isSubmitting && approvingRequestId === req.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    "Aprobar"
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Gestionada</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No hay solicitudes de stock
                            {filterStatus !== "all" ? ` con estado "${filterStatus}"` : ""}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres aprobar esta solicitud? Esto actualizará el stock de los materiales
              correspondientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel aria-label="Cancelar aprobación">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} aria-label="Confirmar aprobación">
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}