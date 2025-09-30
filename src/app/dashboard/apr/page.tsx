
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useMemo } from "react";
import { Package, Send, Loader2, ChevronsUpDown, Check, Wrench, Plus, Trash2, Clock, X, ShoppingCart, PackageSearch, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Material, MaterialRequest, PurchaseRequest as PurchaseRequestType, PurchaseRequestStatus, UserRole } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timestamp } from "firebase/firestore";

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


export default function AprPage() {
  const { materials, addRequest, requests, purchaseRequests, materialCategories } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // State for stock viewer
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  // Requests made by the current user
  const myMaterialRequests = useMemo(() => (requests as CompatibleMaterialRequest[]).filter(r => r.supervisorId === authUser?.id).slice(0, 5), [requests, authUser]);
  const myPurchaseRequests = useMemo(() => purchaseRequests.filter(pr => pr.supervisorId === authUser?.id).slice(0, 5), [purchaseRequests, authUser]);
  
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
        toast({ variant: 'destructive', title: 'Error', description: 'Añade al menos un material y una justificación.'});
        return;
    }

    setIsSubmitting(true);
    try {
      await addRequest({
          items: cart.map(({materialId, quantity}) => ({materialId, quantity})),
          area,
          supervisorId: authUser.id
      });
      toast({ title: 'Éxito', description: 'Tu solicitud de material ha sido enviada.'});
      setCart([]);
      setArea('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la solicitud.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getMaterialStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
    }
  };

  const getPurchaseStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('es-CL');
  }

  // Memoized lists for the stock viewer
  const categories = useMemo(() => {
    const uniqueCats = [...new Set(materials.map((m) => m.category))];
    return ["all", ...uniqueCats].sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let filtered = materials;
    if (searchTerm) {
      filtered = filtered.filter((material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((material) => material.category === categoryFilter);
    }
    return filtered;
  }, [materials, searchTerm, categoryFilter]);


  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Panel de APR`} description="Gestiona el inventario y las herramientas desde tu panel." />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Mis Solicitudes</CardTitle>
                    <CardDescription>Resumen de tus últimas 5 solicitudes de bodega y de compra.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="bodega">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="bodega">Solicitudes de Bodega</TabsTrigger>
                            <TabsTrigger value="compra">Solicitudes de Compra</TabsTrigger>
                        </TabsList>
                        <TabsContent value="bodega">
                             <ScrollArea className="h-60 mt-4">
                                {myMaterialRequests.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Ítems</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {myMaterialRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        <ul className="list-disc list-inside text-xs">
                                                            {(req.items || []).map(item => (
                                                                <li key={item.materialId} className="truncate">
                                                                    {item.quantity}x {materialMap.get(item.materialId)?.name || "N/A"}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                                                    </TableCell>
                                                    <TableCell>{getMaterialStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                        <PackageSearch className="h-10 w-10 mb-2"/>
                                        <p>No tienes solicitudes de bodega recientes.</p>
                                    </div>
                                )}
                             </ScrollArea>
                        </TabsContent>
                        <TabsContent value="compra">
                              <ScrollArea className="h-60 mt-4">
                                {myPurchaseRequests.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {myPurchaseRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        <p className="font-medium text-xs truncate">{req.quantity}x {req.materialName}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                                                    </TableCell>
                                                    <TableCell>{getPurchaseStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                        <ShoppingCart className="h-10 w-10 mb-2"/>
                                        <p>No tienes solicitudes de compra recientes.</p>
                                    </div>
                                )}
                             </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package /> Stock Disponible</CardTitle>
                  <CardDescription>Consulta los materiales disponibles en bodega.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Buscar material..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
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
                            <TableRow key={material.id}>
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
                  </ScrollArea>
                </div>
              </CardContent>
          </Card>
        
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send /> Solicitar Materiales para la Obra</CardTitle>
              <CardDescription>Pide materiales del stock existente en bodega. El administrador deberá aprobar la solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
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
                                        disabled={m.stock <= 0}
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
                        <ScrollArea className="h-32 w-full rounded-md border p-2">
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
                      <Input id="area" placeholder="Ej: Torre Norte, Piso 5" value={area} onChange={e => setArea(e.target.value)} disabled={isSubmitting}/>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : `Enviar Solicitud (${cart.length} Ítems)`}
                  </Button>
              </form>
          </CardContent>
        </Card>
        </div>
      </div>

    </div>
  );
}
