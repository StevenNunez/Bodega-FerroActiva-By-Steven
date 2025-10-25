
"use client";

import React, { useState, useMemo, memo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Clock,
  X,
  Edit,
  ShoppingCart,
  PackageCheck,
  AlertTriangle,
  TrendingUp,
  PackageSearch,
  Box,
  FileText,
  AlertCircle,
  Loader2,
  ThumbsUp,
  Package,
  PackageOpen,
  ChevronsUpDown,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { EditPurchaseRequestForm } from "@/components/operations/edit-purchase-request-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Tipos
type CompatibleMaterialRequest = MaterialRequest & { materialId?: string; quantity?: number };
interface Material {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  archived?: boolean;
}
type PurchaseRequestStatus = import('@/lib/data').PurchaseRequestStatus;
type PurchaseRequest = import('@/lib/data').PurchaseRequest;
type MaterialRequest = import('@/lib/data').MaterialRequest;

interface ReceiveRequestDialogProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, quantity: number, materialId?: string) => Promise<void>;
  materials: Material[];
}

function ReceiveRequestDialog({ request, isOpen, onClose, onConfirm, materials }: ReceiveRequestDialogProps) {
  const [receivedQuantity, setReceivedQuantity] = useState<number | string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (request) {
      setReceivedQuantity(request.quantity);
      setSelectedMaterialId(undefined); // Reset on new request
    } else {
      setReceivedQuantity("");
      setSelectedMaterialId(undefined);
    }
  }, [request]);

  const handleConfirmClick = async () => {
    if (!request) return;
    const quantityNum = Number(receivedQuantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ variant: "destructive", title: "Error", description: "La cantidad debe ser un número positivo." });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(request.id, quantityNum, selectedMaterialId);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const unarchivedMaterials = useMemo(() => materials.filter(m => !m.archived), [materials]);

  if (!request) return null;
  
  const selectedMaterialName = selectedMaterialId
      ? materials.find(m => m.id === selectedMaterialId)?.name
      : "Asignar a material existente...";


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onInteractOutside={(e) => { e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Registrar Recepción de Material</DialogTitle>
          <DialogDescription>
            Confirma la cantidad de <span className="font-semibold">{request.materialName}</span> que ha llegado a bodega.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="received-quantity">Cantidad Recibida Real</Label>
            <Input
              id="received-quantity"
              type="number"
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value)}
              placeholder="Ingresa la cantidad que llegó..."
            />
            <p className="text-xs text-muted-foreground">
              Puedes ajustar la cantidad si es diferente a la aprobada ({request.quantity}).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Asignar a Material Existente (Opcional)</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  <span className="truncate">{selectedMaterialName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar material..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron materiales.</CommandEmpty>
                    <CommandGroup>
                      {unarchivedMaterials.map((material) => (
                        <CommandItem
                          key={material.id}
                          value={material.name}
                          onSelect={() => {
                            setSelectedMaterialId(material.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedMaterialId === material.id ? "opacity-100" : "opacity-0")} />
                          {material.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Si este material ya existe (ej. es un duplicado), selecciónalo aquí para sumar el stock en lugar de crear uno nuevo.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleConfirmClick} disabled={isSubmitting || !receivedQuantity}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
            Confirmar Recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Constantes
const ITEMS_PER_PAGE = 10;
const LOW_STOCK_THRESHOLD = 100;

const STATUS_CONFIG: Record<PurchaseRequestStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "bg-yellow-500" },
  approved: { label: "Aprobado", icon: Check, color: "bg-green-600" },
  rejected: { label: "Rechazado", icon: X, color: "bg-red-600" },
  received: { label: "Recibido", icon: PackageCheck, color: "bg-blue-600" },
  batched: { label: "En Lote", icon: Box, color: "bg-purple-600" },
  ordered: { label: "Orden Generada", icon: FileText, color: "bg-cyan-600" },
};

// Componente para la tabla de solicitudes
const PurchaseRequestTable = memo(
  ({
    requests,
    supervisorMap,
    statusFilter,
    searchTerm,
    page,
    setPage,
    setEditingRequest,
    setReceivingRequest, // Nueva prop
    getStatusBadge,
    getChangeTooltip,
    formatDate,
    setStatusFilter,
    setSearchTerm
  }: {
    requests: PurchaseRequest[];
    supervisorMap: Map<string, string>;
    statusFilter: "all" | PurchaseRequestStatus;
    searchTerm: string;
    page: number;
    setPage: (page: number) => void;
    setEditingRequest: (request: PurchaseRequest | null) => void;
    setReceivingRequest: (request: PurchaseRequest | null) => void; // Nueva prop
    getStatusBadge: (status: PurchaseRequestStatus) => JSX.Element;
    getChangeTooltip: (req: PurchaseRequest) => string | null;
    formatDate: (date: Date | Timestamp | null | undefined) => string;
    setStatusFilter: (value: "all" | PurchaseRequestStatus) => void;
    setSearchTerm: (value: string) => void;
  }) => {
    const filteredRequests = useMemo(() => {
      let filtered = requests;
      if (statusFilter !== "all") {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
      if (searchTerm) {
        filtered = filtered.filter(req => 
            req.materialName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return filtered;
    }, [requests, statusFilter, searchTerm]);

    const paginatedRequests = useMemo(() => {
      return filteredRequests.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    }, [filteredRequests, page]);

    const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
    
    const editableStatuses: PurchaseRequestStatus[] = ["pending"];
    const receivableStatuses: PurchaseRequestStatus[] = ["approved", "batched", "ordered"];

    return (
      <Card className="!max-w-none transition-all duration-300">
        <CardHeader>
          <CardTitle>Gestión de Solicitudes de Compra</CardTitle>
          <CardDescription>
            Lista de solicitudes de compra de materiales para su futura adquisición.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
             <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow">
                      <Label htmlFor="search-material">Buscar por material</Label>
                      <Input
                          id="search-material"
                          type="search"
                          placeholder="Nombre del material..."
                          className="w-full sm:w-[300px]"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Label htmlFor="status-filter">Filtrar por estado</Label>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                        setStatusFilter(value as "all" | PurchaseRequestStatus);
                        setPage(1);
                        }}
                    >
                        <SelectTrigger id="status-filter" aria-label="Filtrar solicitudes por estado">
                        <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {Object.keys(STATUS_CONFIG).map((status) => (
                            <SelectItem key={status} value={status}>
                            {STATUS_CONFIG[status as PurchaseRequestStatus].label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>
            </div>
            <ScrollArea className="border rounded-md">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="min-w-[250px]">Material</TableHead>
                      <TableHead className="min-w-[120px]">Cantidad</TableHead>
                      <TableHead className="min-w-[300px]">Justificación</TableHead>
                      <TableHead className="min-w-[150px]">Solicitante</TableHead>
                      <TableHead className="min-w-[150px]">Fecha Solicitud</TableHead>
                      <TableHead className="min-w-[150px]">Fecha Recepción</TableHead>
                      <TableHead className="min-w-[150px]">Estado</TableHead>
                      <TableHead className="min-w-[180px] text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length > 0 ? (
                      paginatedRequests.map((req) => {
                        const supervisor = supervisorMap.get(req.supervisorId) ?? "N/A";
                        const changeTooltip = getChangeTooltip(req);
                        return (
                          <TableRow key={req.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium min-w-[250px] whitespace-pre-wrap break-words">
                              {req.materialName}
                            </TableCell>
                            <TableCell className="flex items-center gap-2 min-w-[120px]">
                              {req.quantity} {req.unit}
                              {changeTooltip && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{changeTooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[300px] whitespace-pre-wrap break-words">
                              {req.justification || "N/A"}
                            </TableCell>
                            <TableCell className="min-w-[150px]">{supervisor}</TableCell>
                            <TableCell className="min-w-[150px]">{formatDate(req.createdAt)}</TableCell>
                            <TableCell className="min-w-[150px]">{formatDate(req.receivedAt)}</TableCell>
                            <TableCell className="min-w-[150px]">{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="text-right min-w-[180px] space-x-2">
                              {editableStatuses.includes(req.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRequest(req)}
                                  aria-label={`Gestionar solicitud de compra para ${req.materialName}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Gestionar
                                </Button>
                              )}
                              {receivableStatuses.includes(req.status) && (
                                 <Button
                                    size="sm"
                                    onClick={() => setReceivingRequest(req)}
                                    aria-label={`Recibir solicitud de compra ${req.materialName}`}
                                  >
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                    Recibir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No hay solicitudes de compra para los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
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
                  onClick={() => setPage(page + 1)}
                  aria-label="Página siguiente de solicitudes"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

// Componente para el visor de stock
const StockViewer = memo(
  ({ materials, categories, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter }: {
    materials: Material[];
    categories: string[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    categoryFilter: string;
    setCategoryFilter: (category: string) => void;
  }) => {
    const filteredMaterials = useMemo(() => {
      return materials
        .filter((material) =>
          searchTerm ? material.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
        )
        .filter((material) => (categoryFilter !== "all" ? material.category === categoryFilter : true));
    }, [materials, searchTerm, categoryFilter]);

    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package /> Stock Disponible
          </CardTitle>
          <CardDescription>Consulta los materiales disponibles en bodega.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Buscar material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar materiales por nombre"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por categoría">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat, index) => (
                    <SelectItem key={`${cat}-${index}`} value={cat}>
                      {cat === "all" ? "Todas" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-60 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length > 0 ? (
                    filteredMaterials.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-muted-foreground">{material.category}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{material.stock.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        No se encontraron materiales.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    );
  }
);

// Componente para materiales con bajo stock
const LowStockCard = memo(({ materials }: { materials: Material[] }) => {
  const lowStockMaterials = useMemo(() => {
    return materials.filter((m) => m.stock < LOW_STOCK_THRESHOLD);
  }, [materials]);

  return (
    <Card className="border-amber-500/50 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-500">
          <AlertTriangle /> Materiales con Bajo Stock
        </CardTitle>
        <CardDescription>Materiales con menos de 100 unidades disponibles. Prioridad de compra.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60 border rounded-md">
          <div className="p-1">
            {lowStockMaterials.length > 0 ? (
              <ul className="space-y-3 p-2">
                {lowStockMaterials.map((mat) => (
                  <li
                    key={mat.id}
                    className="flex justify-between items-center text-sm p-2 rounded-md border border-amber-500/20"
                    role="listitem"
                  >
                    <span className="pr-4">{mat.name}</span>
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
          </div>
           <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Componente para materiales más solicitados
const MostUsedMaterialsCard = memo(
  ({ requests, materialMap }: { requests: CompatibleMaterialRequest[]; materialMap: Map<string, Material> }) => {
    const mostUsedMaterials = useMemo(() => {
      const usage = requests
        .filter((r) => r.status === "approved")
        .reduce((acc, req) => {
          const items = req.items && Array.isArray(req.items) ? req.items : [{ materialId: req.materialId, quantity: req.quantity }];
          items.forEach((item) => {
            if (item.materialId && item.quantity) {
              acc[item.materialId] = (acc[item.materialId] || 0) + item.quantity;
            }
          });
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

    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp /> Materiales Más Solicitados
          </CardTitle>
          <CardDescription>Top 5 materiales más pedidos de la bodega.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60 border rounded-md">
            <div className="p-1">
              {mostUsedMaterials.length > 0 ? (
                <ul className="space-y-3 p-2">
                  {mostUsedMaterials.map((item, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50"
                      role="listitem"
                    >
                      <span className="font-medium pr-4">{item.name}</span>
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
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
);

// Componente para últimas salidas de bodega
const RecentApprovedRequestsCard = memo(
  ({
    requests,
    users,
    materialMap,
    formatDate,
  }: {
    requests: CompatibleMaterialRequest[];
    users: { id: string; name: string }[];
    materialMap: Map<string, Material>;
    formatDate: (date: Date | Timestamp | null | undefined) => string;
  }) => {
    const recentApprovedRequests = useMemo(() => {
      return requests
        .filter((r) => r.status === "approved")
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
    }, [requests]);

    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen /> Últimas Salidas de Bodega
          </CardTitle>
          <CardDescription>Las 5 solicitudes de material más recientes que fueron aprobadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60 border rounded-md">
            <div className="p-4">
              {recentApprovedRequests.length > 0 ? (
                <ul className="space-y-3">
                  {recentApprovedRequests.map((req) => {
                    const supervisor = users.find((u) => u.id === req.supervisorId);
                    return (
                      <li
                        key={`approved-${req.id}`}
                        className="text-sm p-3 rounded-lg border bg-muted/50"
                        role="listitem"
                      >
                        <ul className="list-disc list-inside space-y-1">
                          {req.items && Array.isArray(req.items) ? (
                            req.items.map((item) => (
                              <li key={item.materialId} className="font-semibold">
                                {materialMap.get(item.materialId || "")?.name || "N/A"}{" "}
                                <span className="font-normal text-primary">({item.quantity} uds)</span>
                              </li>
                            ))
                          ) : (
                            <li key={`${req.id}-${req.materialId}`} className="font-semibold">
                              {materialMap.get(req.materialId || "")?.name || "N/A"}{" "}
                              <span className="font-normal text-primary">({req.quantity} uds)</span>
                            </li>
                          )}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                          Para: {req.area} (Solicitado por {supervisor?.name || "N/A"})
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          Aprobado: {formatDate(req.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                  <PackageSearch className="h-10 w-10 mb-2" />
                  <p>No hay salidas recientes.</p>
                </div>
              )}
            </div>
             <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
);

// Componente para últimos ingresos a bodega
const RecentReceivedCard = memo(
  ({
    purchaseRequests,
    users,
    formatDate,
  }: {
    purchaseRequests: PurchaseRequest[];
    users: { id: string; name: string }[];
    formatDate: (date: Date | Timestamp | null | undefined) => string;
  }) => {
    const recentReceived = useMemo(() => {
      return purchaseRequests
        .filter((r) => r.status === "received" && r.receivedAt)
        .sort((a, b) => {
          const dateA = a.receivedAt ? new Date(a.receivedAt as any).getTime() : 0;
          const dateB = b.receivedAt ? new Date(b.receivedAt as any).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
    }, [purchaseRequests]);

    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck /> Últimos Ingresos a Bodega
          </CardTitle>
          <CardDescription>Registro de los materiales de compra más recientes marcados como recibidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60 border rounded-md">
            <div className="p-4">
              {recentReceived.length > 0 ? (
                <ul className="space-y-3">
                  {recentReceived.map((req) => {
                    return (
                      <li
                        key={`received-${req.id}`}
                        className="text-sm p-3 rounded-lg border bg-muted/50"
                        role="listitem"
                      >
                        <p className="font-semibold max-w-full truncate">
                          {req.materialName} <span className="font-normal text-primary">({req.quantity} uds)</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                          Justificación: <span className="font-medium">"{req.justification || "N/A"}"</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          Ingreso: {formatDate(req.receivedAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                  <PackageSearch className="h-10 w-10 mb-2" />
                  <p>No hay ingresos recientes.</p>
                </div>
              )}
            </div>
             <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
);

// Componente principal
export default function OperationsPage() {
  const { purchaseRequests, users, requests, materials, receivePurchaseRequest, isLoading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [receivingRequest, setReceivingRequest] = useState<PurchaseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseRequestStatus>("all");
  const [page, setPage] = useState(1);
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Utilidades
  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = getDate(date);
    return jsDate
      ? jsDate.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "N/A";
  };

  const handleReceive = async (id: string, quantity: number, existingMaterialId?: string) => {
    try {
      await receivePurchaseRequest(id, quantity, existingMaterialId);
      setReceivingRequest(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el stock.",
      });
    }
  };

  const supervisorMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m as Material])), [materials]);

  const getStatusBadge = useMemo(
    () => (status: PurchaseRequestStatus) => {
      const { label, icon: Icon, color } = STATUS_CONFIG[status] || {
        label: "Desconocido",
        icon: Box,
        color: "bg-gray-500",
      };
      return (
        <Badge variant="secondary" className={`${color} text-white`}>
          <Icon className="mr-1 h-3 w-3" />
          {label}
        </Badge>
      );
    },
    []
  );

  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
      return `Cantidad original: ${req.originalQuantity}. ${req.notes || "Sin notas adicionales."}`;
    }
    return req.notes || null;
  };

  const categories = useMemo(() => {
    const uniqueCats = [...new Set(materials.map((m) => m.category))];
    return ["all", ...uniqueCats].sort();
  }, [materials]);

  const counts = useMemo(
    () => ({
      pending: purchaseRequests.filter((r) => r.status === "pending").length,
      approvedNotInLot: purchaseRequests.filter((r) => r.status === "approved").length,
      batched: purchaseRequests.filter((r) => r.status === "batched").length,
      ordered: purchaseRequests.filter((r) => r.status === "ordered").length,
    }),
    [purchaseRequests]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 bg-background min-h-screen">
      {editingRequest && (
        <EditPurchaseRequestForm
          request={editingRequest}
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}
      <ReceiveRequestDialog
        request={receivingRequest}
        isOpen={!!receivingRequest}
        onClose={() => setReceivingRequest(null)}
        onConfirm={handleReceive}
        materials={materials}
      />
      <PageHeader
        title={`Bienvenido, ${authUser?.name ?? "Usuario"}`}
        description="Gestiona las solicitudes de compra y supervisa el estado general de la operación."
      />
      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-8">
          <Card className="shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle>Estado del Flujo de Compras</CardTitle>
              <CardDescription>Vista general del ciclo de vida de las solicitudes de compra.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Pendientes", count: counts.pending, icon: ShoppingCart, color: "text-yellow-500 bg-yellow-500/20" },
                { label: "Aprobadas (sin lote)", count: counts.approvedNotInLot, icon: ThumbsUp, color: "text-green-500 bg-green-500/20" },
                { label: "En Lote", count: counts.batched, icon: Box, color: "text-purple-500 bg-purple-500/20", link: "/dashboard/operations/lots" },
                { label: "Ordenadas", count: counts.ordered, icon: FileText, color: "text-cyan-500 bg-cyan-500/20", link: "/dashboard/operations/orders" },
              ].map(({ label, count, icon: Icon, color, link }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    {link ? (
                      <Link href={link} className="text-sm text-muted-foreground hover:underline">
                        {label}
                      </Link>
                    ) : (
                      <p className="text-sm text-muted-foreground">{label}</p>
                    )}
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <StockViewer
            materials={materials}
            categories={categories}
            searchTerm={stockSearchTerm}
            setSearchTerm={setStockSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />
          <PurchaseRequestTable
            requests={purchaseRequests}
            supervisorMap={supervisorMap}
            statusFilter={statusFilter}
            searchTerm={requestSearchTerm}
            page={page}
            setPage={setPage}
            setEditingRequest={setEditingRequest}
            setReceivingRequest={setReceivingRequest} // Pasar la función
            getStatusBadge={getStatusBadge}
            getChangeTooltip={getChangeTooltip}
            formatDate={formatDate}
            setStatusFilter={setStatusFilter}
            setSearchTerm={setRequestSearchTerm}
          />
        </div>
      </div>
    </div>
  );
}
