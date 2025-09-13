
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, X, Send, Loader2, ChevronsUpDown, Package, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Material, MaterialRequest } from "@/lib/data";

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
};


export default function AdminRequestsPage() {
  const { requests, materials, users, approveRequest, addRequest, isLoading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // State for the new multi-item request form
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for the temporary item being added to the cart
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest(requestId);
      toast({ title: "Solicitud Aprobada", description: "El stock ha sido actualizado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al aprobar", description: error?.message || "No se pudo completar la acción." });
    }
  };

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
    if (cart.length === 0 || !area || !authUser) {
      toast({ variant: "destructive", title: "Error", description: "Añade al menos un material y una justificación." });
      return;
    }

    setIsSubmitting(true);
    try {
      await addRequest({
        items: cart.map(({materialId, quantity}) => ({materialId, quantity})),
        area,
        supervisorId: authUser.id,
      });
      toast({ title: "Éxito", description: "Tu solicitud ha sido enviada para aprobación." });
      setCart([]);
      setArea("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar la solicitud." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getDate = (date: Date | Timestamp) => {
    return date instanceof Timestamp ? date.toDate() : date;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Solicitudes de Materiales"
        description="Revisa y aprueba las solicitudes, o crea una nueva para justificar salidas de bodega."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send /> Registrar Salida de Bodega</CardTitle>
              <CardDescription>Crea una solicitud con uno o más materiales para registrar su salida.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-6">
                {/* Add item section */}
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
                                    {materials.map((m) => (
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
                
                {/* Justification and Submit */}
                <div className="space-y-2">
                  <Label htmlFor="area">Área / Justificación General</Label>
                  <Input id="area" placeholder="Ej: Reparaciones varias en taller" value={area} onChange={e => setArea(e.target.value)} disabled={isSubmitting} />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Registrando...</> : `Registrar Salida (${cart.length} Ítems)`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="!max-w-none">
            <CardHeader>
              <CardTitle>Historial de Solicitudes</CardTitle>
              <CardDescription>
                Aquí se listan todas las solicitudes de materiales, tanto las pendientes como las ya gestionadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[calc(80vh-15rem)]">
                    <div className="p-6">
                        <Table className="min-w-[700px]">
                            <TableHeader>
                            <TableRow>
                                <TableHead>Ítems</TableHead>
                                <TableHead>Área/Proyecto</TableHead>
                                <TableHead>Solicitante</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {requests.length > 0 ? (
                                (requests as CompatibleMaterialRequest[]).map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">
                                        <ul className="list-disc list-inside">
                                            {req.items && Array.isArray(req.items) ? (
                                                req.items.map(item => (
                                                    <li key={item.materialId} className="text-xs truncate">
                                                        {item.quantity}x {materialMap.get(item.materialId)?.name || "N/A"}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-xs truncate">
                                                    {req.quantity}x {materialMap.get(req.materialId || '')?.name || "N/A"}
                                                </li>
                                            )}
                                        </ul>
                                    </TableCell>
                                    <TableCell>{req.area}</TableCell>
                                    <TableCell>{userMap.get(req.supervisorId) || "N/A"}</TableCell>
                                    <TableCell>{getDate(req.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                    <TableCell className="text-right">
                                    {req.status === "pending" && (
                                        <Button size="sm" onClick={() => handleApprove(req.id)}>
                                        Aprobar
                                        </Button>
                                    )}
                                    {req.status !== "pending" && (
                                        <span className="text-xs text-muted-foreground">Gestionada</span>
                                    )}
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No hay solicitudes de stock todavía.
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
    </div>
  );
}

    