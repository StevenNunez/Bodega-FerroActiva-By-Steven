

"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/modules/core/hooks/use-toast";
import { Send, Loader2, ChevronsUpDown, Check, Clock, Package, X, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Material, MaterialRequest } from "@/modules/core/lib/data";

interface CartItem {
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    stock: number;
}

// Extend the MaterialRequest type to include old format for compatibility
type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
    items?: { materialId: string; quantity: number }[];
};


export default function SupervisorRequestPage() {
  const { materials, addMaterialRequest, requests, isLoading, user: authUser } = useAppState();
  const { toast } = useToast();
  
  // State for the new multi-item request form
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for the temporary item being added to the cart
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const materialMap = useMemo<Map<string, Material>>(() => new Map((materials || []).map((m: Material) => [m.id, m])), [materials]);
  const myRequests = useMemo(() => ((requests || []) as CompatibleMaterialRequest[]).filter((r: CompatibleMaterialRequest) => r.supervisorId === authUser?.id), [requests, authUser]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return myRequests;
    return myRequests.filter((r: CompatibleMaterialRequest) => r.status === statusFilter);
  }, [myRequests, statusFilter]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : new Date(date as any);
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

  const getStatusBadge = useMemo(
    () => (status: "pending" | "approved" | "rejected") => {
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
        default:
          return <Badge variant="outline">Desconocido</Badge>;
      }
    },
    []
  );

  const handleAddItemToCart = () => {
    if (!currentMaterialId || !currentQuantity) {
        toast({ variant: "destructive", title: "Error", description: "Selecciona un material y una cantidad." });
        return;
    }
    const material = materialMap.get(currentMaterialId);
    if (!material) {
        toast({ variant: "destructive", title: "Error", description: "Material no encontrado." });
        return;
    }
    const quantity = Number(currentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
        toast({ variant: "destructive", title: "Error", description: "La cantidad debe ser un número positivo." });
        return;
    }
    if (quantity > material.stock) {
        toast({ variant: "destructive", title: "Stock Insuficiente", description: `Solo hay ${material.stock} unidades disponibles.` });
        return;
    }
    if (cart.some(item => item.materialId === currentMaterialId)) {
        toast({ variant: "destructive", title: "Error", description: "Este material ya está en la solicitud." });
        return;
    }

    setCart([...cart, { 
        materialId: material.id, 
        materialName: material.name, 
        quantity,
        unit: material.unit,
        stock: material.stock 
    }]);
    setCurrentMaterialId(null);
    setCurrentQuantity("");
    setPopoverOpen(false);
  }

  const handleRemoveItemFromCart = (materialId: string) => {
      setCart(cart.filter(item => item.materialId !== materialId));
  }

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !area.trim() || !authUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Añade al menos un material y especifica el área de destino.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addMaterialRequest({
        items: cart.map(({materialId, quantity}) => ({materialId, quantity})),
        area,
        supervisorId: authUser.id,
      });
      toast({
        title: "Éxito",
        description: "Tu solicitud de material ha sido enviada.",
      });
      setCart([]);
      setArea("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar la solicitud.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Solicitud de Materiales para Obra"
        description="Rellena el formulario para pedir materiales de la bodega central."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send /> Generar Solicitud de Materiales
            </CardTitle>
            <CardDescription>
              Completa el formulario para solicitar nuevos materiales para la obra. El administrador deberá aprobar tu solicitud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestSubmit} className="space-y-6">
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <h4 className="font-medium text-center">Añadir Material a la Solicitud</h4>
                    <div className="space-y-2">
                        <Label htmlFor="material">Material</Label>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isSubmitting}>
                                <span className="truncate">
                                {currentMaterialId ? materialMap.get(currentMaterialId)?.name : "Selecciona un material..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar material..." />
                                <CommandList>
                                <CommandEmpty>No se encontró el material.</CommandEmpty>
                                <CommandGroup>
                                    {(materials || []).map((m: Material) => (
                                    <CommandItem
                                        key={m.id}
                                        value={m.name}
                                        disabled={m.stock <= 0 || cart.some(item => item.materialId === m.id)}
                                        onSelect={() => {
                                            setCurrentMaterialId(m.id);
                                            setPopoverOpen(false);
                                        }}
                                        className="flex justify-between"
                                    >
                                        <div className="flex items-center">
                                        <Check className={cn("mr-2 h-4 w-4", currentMaterialId === m.id ? "opacity-100" : "opacity-0")} />
                                        {m.name}
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
                        <Input id="quantity" type="number" placeholder="Ej: 10" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <Button type="button" variant="secondary" className="w-full" onClick={handleAddItemToCart}><Plus className="mr-2 h-4 w-4"/> Añadir a la Solicitud</Button>
                </div>
                
                {cart.length > 0 && (
                    <div className="space-y-2">
                        <Label>Materiales en la Solicitud</Label>
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                            <div className="space-y-2">
                            {cart.map(item => (
                                <div key={item.materialId} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                    <div>
                                        <p className="text-sm font-medium">{item.materialName}</p>
                                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItemFromCart(item.materialId)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="area">Área / Proyecto de Destino</Label>
                  <Input
                    id="area"
                    placeholder="Ej: Torre Norte, Piso 5"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={isSubmitting}
                    aria-label="Área o proyecto de destino"
                  />
                </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0 || !area.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitud"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="!max-w-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package /> Historial de Solicitudes
            </CardTitle>
            <CardDescription>Revisa el estado de tus solicitudes de materiales de bodega.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
              <div className="w-[180px]">
                <Label htmlFor="status-filter">Filtrar por estado</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as "all" | "pending" | "approved" | "rejected");
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
                  </SelectContent>
                </Select>
                <span id="status-filter-description" className="sr-only">
                  Filtra solicitudes por estado
                </span>
              </div>
              <div className="relative overflow-x-auto max-w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-[350px]">Ítems Solicitados</TableHead>
                        <TableHead className="w-[150px]">Área</TableHead>
                        <TableHead className="w-[150px]">Fecha</TableHead>
                        <TableHead className="w-[150px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : paginatedRequests.length > 0 ? (
                        paginatedRequests.map((req: CompatibleMaterialRequest) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium max-w-[350px]">
                                <ul className="list-disc list-inside">
                                    {req.items && Array.isArray(req.items) ? (
                                        req.items.map(item => {
                                            const material = materialMap.get(item.materialId);
                                            return (
                                                <li key={item.materialId} className="text-xs truncate">
                                                    {item.quantity}x {material?.name || "N/A"}
                                                </li>
                                            )
                                        })
                                    ) : (
                                        <li className="text-xs truncate">
                                            {req.quantity}x {materialMap.get(req.materialId || '')?.name || "N/A"}
                                        </li>
                                    )}
                                </ul>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{req.area}</TableCell>
                            <TableCell>{formatDate(req.createdAt)}</TableCell>
                            <TableCell>{getStatusBadge(req.status as 'pending' | 'approved' | 'rejected')}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No hay solicitudes para el estado seleccionado.
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
    </div>
  );
}

