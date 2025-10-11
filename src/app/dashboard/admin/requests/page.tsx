"use client";

import React, { useState, useMemo, useCallback, memo, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, X, Send, Loader2, ChevronsUpDown, Package, Plus, Trash2, XCircle, CalendarIcon } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";


// Interfaces
interface User {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
};


interface CartItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  stock: number;
}

// Componente memoizado para cada ítem del carrito
const CartItemRow = memo(
  ({ item, onRemove }: { item: CartItem; onRemove: (materialId: string) => void }) => (
    <div className="flex items-center justify-between bg-muted p-3 rounded-lg hover:bg-muted/80 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.materialName}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity.toLocaleString()} {item.unit} (Stock: {item.stock.toLocaleString()})
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.materialId)}
        aria-label={`Eliminar ${item.materialName} de la solicitud`}
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
    </div>
  )
);

// Componente memoizado para el selector de materiales
const MaterialSelector = memo(
  ({
    materials,
    currentMaterialId,
    setCurrentMaterialId,
    isSubmitting,
    popoverOpen,
    setPopoverOpen,
  }: {
    materials: Material[];
    currentMaterialId: string | null;
    setCurrentMaterialId: (id: string | null) => void;
    isSubmitting: boolean;
    popoverOpen: boolean;
    setPopoverOpen: (open: boolean) => void;
  }) => {
    const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

    return (
      <div className="space-y-2">
        <Label htmlFor="material">Material</Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Seleccionar material"
              className="w-full justify-between truncate"
              disabled={isSubmitting || materials.length === 0}
            >
              <span className="truncate">
                {currentMaterialId
                  ? materialMap.get(currentMaterialId)?.name
                  : "Selecciona un material..."}
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
                  {materials.map((m) => (
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
                      <span className="text-xs text-muted-foreground">Stock: {m.stock.toLocaleString()}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

// Componente principal
export default function AdminRequestsPage() {
  const { requests, materials, users, approveRequest, addRequest, loading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");


  // Mapas memoizados
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  
  const getDate = useCallback((date: Date | Timestamp | undefined | null): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  }, []);

  // Filtrar solicitudes
  const filteredRequests = useMemo(() => {
     const isSearching = searchTerm.trim() !== '' || filterStatus !== 'all';
     
     return (requests as CompatibleMaterialRequest[]).filter(req => {
        const requestDate = getDate(req.createdAt);
        if (!requestDate) return false;

        const matchesSearchTerm = isSearching 
            ? (userMap.get(req.supervisorId)?.toLowerCase().includes(searchTerm.toLowerCase()) || req.area.toLowerCase().includes(searchTerm.toLowerCase()))
            : true;

        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        
        const matchesDate = !isSearching && selectedDate ? isSameDay(requestDate, selectedDate) : true;

        return matchesDate && matchesSearchTerm && matchesStatus;
     });

  }, [requests, filterStatus, selectedDate, searchTerm, userMap, getDate]);


  // Resumen del carrito
  const cartSummary = useMemo(() => {
    const totalItems = cart.length;
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    return { totalItems, totalQuantity };
  }, [cart]);

  // Debounce para cantidad
  const debouncedSetQuantity = useRef(debounce((value: string) => setCurrentQuantity(value), 300)).current;

  // Aprobar solicitud
  const handleApprove = useCallback(
    async (requestId: string) => {
      if (authUser?.role !== "admin") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Solo los administradores pueden aprobar solicitudes.",
        });
        return;
      }
      const req = requests.find((r) => r.id === requestId);
      if (req) {
        for (const item of req.items) {
          const material = materialMap.get(item.materialId);
          if (!material || material.stock < item.quantity) {
            toast({
              variant: "destructive",
              title: "Error",
              description: `Stock insuficiente para ${material?.name || "material"}.`,
            });
            return;
          }
        }
      }
      setApprovingRequestId(requestId);
      setShowConfirmDialog(true);
    },
    [authUser, requests, materialMap, toast]
  );

  // Confirmar aprobación
  const confirmApprove = useCallback(async () => {
    if (!approvingRequestId) return;
    setIsSubmitting(true);
    try {
      await approveRequest(approvingRequestId);
      toast({ title: "Éxito", description: "Solicitud aprobada exitosamente.", variant: "success" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "No se pudo aprobar la solicitud.",
      });
    } finally {
      setIsSubmitting(false);
      setApprovingRequestId(null);
      setShowConfirmDialog(false);
    }
  }, [approvingRequestId, approveRequest, toast]);

  // Añadir material al carrito
  const handleAddItemToCart = useCallback(() => {
    if (!currentMaterialId || !currentQuantity) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona un material y una cantidad.",
      });
      return;
    }
    const material = materialMap.get(currentMaterialId);
    if (!material) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Material no encontrado.",
      });
      return;
    }
    const quantity = Number(currentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La cantidad debe ser un número positivo.",
      });
      return;
    }
    if (quantity > material.stock) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Solo hay ${material.stock.toLocaleString()} unidades disponibles.`,
      });
      return;
    }
    if (cart.some((item) => item.materialId === currentMaterialId)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Este material ya está en la solicitud.",
      });
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
  }, [currentMaterialId, currentQuantity, cart, materialMap, toast]);

  // Eliminar material del carrito
  const handleRemoveItemFromCart = useCallback((materialId: string) => {
    setCart((prev) => prev.filter((item) => item.materialId !== materialId));
  }, []);

  // Enviar solicitud
  const handleRequestSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (cart.length === 0 || !area || !authUser) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Añade al menos un material y una justificación.",
        });
        return;
      }
      if (authUser.role !== "admin") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Solo los administradores pueden registrar salidas.",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        await addRequest({
          items: cart.map(({ materialId, quantity }) => ({ materialId, quantity })),
          area,
          supervisorId: authUser.id,
        });
        toast({
          title: "Éxito",
          description: "Solicitud enviada para aprobación.",
          variant: "success",
        });
        setCart([]);
        setArea("");
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo enviar la solicitud.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [cart, area, authUser, addRequest, toast]
  );

  // Obtener badge de estado
  const getStatusBadge = useCallback(
    (status: "pending" | "approved" | "rejected") => {
      switch (status) {
        case "pending":
          return (
            <Badge variant="secondary" className="bg-yellow-600 text-white">
              <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
              Pendiente
            </Badge>
          );
        case "approved":
          return (
            <Badge variant="default" className="bg-green-700 text-white">
              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
              Aprobado
            </Badge>
          );
        case "rejected":
          return (
            <Badge variant="destructive" className="bg-red-600 text-white">
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Rechazado
            </Badge>
          );
        default:
          return <Badge variant="outline">Desconocido</Badge>;
      }
    },
    []
  );

  // Formatear fecha para la tabla
  const formatTableDate = useCallback((date: Date | Timestamp | undefined | null) => {
    const d = getDate(date);
    return d ? format(d, "dd/MM/yyyy HH:mm") : "N/A";
  }, [getDate]);

  // Limpiar filtro
  const handleClearFilter = useCallback(() => {
    setFilterStatus("all");
    setSearchTerm("");
  }, []);

  // Materiales disponibles
  const availableMaterials = useMemo(
    () => materials.filter((m) => m.stock > 0 && !cart.some((item) => item.materialId === m.id)),
    [materials, cart]
  );

  // Estado de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="alert" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 max-w-[100vw] overflow-x-hidden">
      <PageHeader
        title="Gestión de Solicitudes de Materiales"
        description="Revisa y aprueba las solicitudes, o crea una nueva para justificar salidas de bodega."
      />
      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Formulario de solicitud */}
        <div>
          <Card className="max-w-full rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" aria-hidden="true" />
                Registrar Salida de Bodega
              </CardTitle>
              <CardDescription>Crea una solicitud con uno o más materiales para registrar su salida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleRequestSubmit}>
                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                  <h4 className="font-medium text-center">Añadir Material a la Solicitud</h4>
                  {availableMaterials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-4">
                      <Package className="h-8 w-8 mb-2" aria-hidden="true" />
                      <p className="text-sm">No hay materiales disponibles.</p>
                    </div>
                  ) : (
                    <>
                      <MaterialSelector
                        materials={availableMaterials}
                        currentMaterialId={currentMaterialId}
                        setCurrentMaterialId={setCurrentMaterialId}
                        isSubmitting={isSubmitting}
                        popoverOpen={popoverOpen}
                        setPopoverOpen={setPopoverOpen}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input
                          id="quantity"
                          type="number"
                          placeholder="Ej: 10"
                          value={currentQuantity}
                          onChange={(e) => debouncedSetQuantity(e.target.value)}
                          disabled={isSubmitting || !currentMaterialId}
                          aria-describedby="quantity-error"
                        />
                        <span id="quantity-error" className="text-sm text-destructive hidden" aria-live="polite">
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
                    </>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <Label>Materiales en la Solicitud</Label>
                      <Badge variant="outline">
                        {cartSummary.totalItems} ítems, {cartSummary.totalQuantity} unidades
                      </Badge>
                    </div>
                    <ScrollArea
                      className="h-40 w-full rounded-lg border p-2"
                      role="region"
                      aria-label="Lista de materiales en la solicitud"
                    >
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <CartItemRow
                            key={item.materialId}
                            item={item}
                            onRemove={handleRemoveItemFromCart}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label htmlFor="area">Área / Justificación General</Label>
                  <Input
                    id="area"
                    placeholder="Ej: Reparaciones varias en taller"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={isSubmitting}
                    aria-describedby="area-error"
                  />
                  <span id="area-error" className="text-sm text-destructive hidden" aria-live="polite">
                    Ingresa una justificación válida para la solicitud.
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
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

        {/* Historial de solicitudes */}
        <div>
          <Card className="max-w-full rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle>Historial de Solicitudes</CardTitle>
              <CardDescription>
                Lista de todas las solicitudes de materiales, tanto pendientes como gestionadas.
              </CardDescription>
              <div className="flex flex-col sm:flex-row justify-end mt-2 gap-2">
                 <Input 
                    placeholder="Buscar por solicitante o área..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                 />
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", {locale: es}) : <span>Selecciona una fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                        />
                    </PopoverContent>
                 </Popover>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | "pending" | "approved" | "rejected")}>
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
                {(filterStatus !== "all" || searchTerm !== "") && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilter}
                    aria-label="Limpiar filtro de estado"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <Table className="min-w-[900px]">
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-[280px] whitespace-nowrap">Ítems</TableHead>
                      <TableHead className="w-[180px] whitespace-nowrap">Área/Proyecto</TableHead>
                      <TableHead className="w-[160px] whitespace-nowrap">Solicitante</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Estado</TableHead>
                      <TableHead className="w-[140px] text-right whitespace-nowrap">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length > 0 ? (
                        filteredRequests.map((req) => {
                            const itemsToShow = (Array.isArray(req.items) && req.items.length > 0)
                                ? req.items
                                : (req.materialId && req.quantity ? [{ materialId: req.materialId, quantity: req.quantity }] : []);

                            return (
                          <TableRow
                            key={req.id}
                            data-testid={`request-row-${req.id}`}
                            className="hover:bg-muted/50 transition-all duration-200"
                          >
                            <TableCell className="font-medium align-top whitespace-nowrap">
                                <ul className="list-disc list-inside space-y-1">
                                  {itemsToShow.map((item) => (
                                    <li key={item.materialId} className="text-sm">
                                      {item.quantity}x{" "}
                                      {materialMap.get(item.materialId)?.name || "Material no encontrado"}
                                    </li>
                                  ))}
                                </ul>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{req.area || "N/A"}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {userMap.get(req.supervisorId) || "Usuario no encontrado"}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatTableDate(req.createdAt)}</TableCell>
                            <TableCell className="whitespace-nowrap">{getStatusBadge(req.status)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
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
                        )})
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <Package className="h-8 w-8 mb-2" aria-hidden="true" />
                              <p>
                                No hay solicitudes que coincidan con los filtros.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                 </Table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres aprobar esta solicitud? Esto actualizará el stock de los materiales correspondientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel aria-label="Cancelar aprobación">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              aria-label="Confirmar aprobación"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Aprobando...
                </>
              ) : (
                "Aprobar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
