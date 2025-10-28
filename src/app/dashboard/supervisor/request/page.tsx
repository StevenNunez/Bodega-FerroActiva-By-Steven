
"use client";

import React, { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, ChevronsUpDown, Check, Clock, Package, X, Plus, Trash2, CalendarIcon, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";
import type { Material, MaterialRequest } from "@/lib/data";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const Calendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), { ssr: false });

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


export default function SupervisorRequestPage() {
  const { materials, addRequest, requests, can } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  
  const getDate = (date: Date | Timestamp | undefined | null): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const myRequests = useMemo(() => {
      const allMyRequests = (requests as CompatibleMaterialRequest[]).filter(r => r.supervisorId === authUser?.id);
      if (!selectedDate) return allMyRequests;
      return allMyRequests.filter(r => {
        const requestDate = getDate(r.createdAt);
        return requestDate && isSameDay(requestDate, selectedDate);
      });
  }, [requests, authUser, selectedDate, getDate]);
  
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
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.'});
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

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <PageHeader 
        title="Solicitud de Materiales para Obra" 
        description="Rellena el formulario para pedir materiales de la bodega central." 
      />
      <div className="grid grid-cols-1 gap-8 items-start">
        {can('material_requests:create') && (
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send /> Generar Solicitud de Materiales</CardTitle>
                <CardDescription>Completa el formulario para solicitar nuevos materiales para la obra. El administrador deberá aprobar tu solicitud.</CardDescription>
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
        )}
        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package /> Historial de Solicitudes</CardTitle>
            <CardDescription>Revisa el estado de tus solicitudes de materiales de bodega.</CardDescription>
            <div className="flex items-center gap-2 pt-4">
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
                          {selectedDate ? format(selectedDate, "PPP", {locale: es}) : <span>Filtrar por fecha</span>}
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
               {selectedDate && <Button variant="ghost" size="icon" onClick={() => setSelectedDate(undefined)}><XCircle className="h-4 w-4"/></Button>}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Items</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {myRequests.length > 0 ? (
                        myRequests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium max-w-xs">
                                     <ul className="list-disc list-inside">
                                        {req.items && Array.isArray(req.items) ? (
                                            req.items.map(item => (
                                                <li key={item.materialId} className="text-xs truncate">
                                                    {item.quantity}x {materialMap.get(item.materialId)?.name || 'N/A'}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-xs truncate">
                                                {req.quantity}x {materialMap.get(req.materialId || '')?.name || 'N/A'}
                                            </li>
                                        )}
                                    </ul>
                                </TableCell>
                                <TableCell className="max-w-[100px] truncate">{req.area}</TableCell>
                                <TableCell>{getDate(req.createdAt)?.toLocaleDateString()}</TableCell>
                                <TableCell>{getStatusBadge(req.status)}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                            No has realizado solicitudes de stock.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
