
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Send, Loader2, ChevronsUpDown, Check, Clock, Package, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";


export default function SupervisorRequestPage() {
  const { materials, addRequest, requests } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);


  const myRequests = requests.filter(r => r.supervisorId === authUser?.id);
  
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !quantity || !area || !authUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.'});
        return;
    }
    setIsSubmitting(true);
    try {
      await addRequest({
          materialId,
          quantity: parseInt(quantity),
          area,
          supervisorId: authUser.id
      });
      toast({ title: 'Éxito', description: 'Tu solicitud de material ha sido enviada.'});
      setMaterialId('');
      setQuantity('');
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

  const getDate = (date: Date | Timestamp) => {
      return date instanceof Timestamp ? date.toDate() : date;
  }


  return (
    <div className="flex flex-col gap-8">
      <PageHeader 
        title="Solicitud de Materiales para Obra" 
        description="Rellena el formulario para pedir materiales de la bodega central." 
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send /> Generar Solicitud de Materiales</CardTitle>
              <CardDescription>Completa el formulario para solicitar nuevos materiales para la obra. El administrador deberá aprobar tu solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="material">Material</Label>
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={isSubmitting}
                          >
                            <span className="truncate">
                                {materialId
                                  ? materials.find((m) => m.id === materialId)?.name
                                  : "Selecciona o busca un material"}
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
                                    onSelect={() => {
                                      setMaterialId(m.id);
                                      setPopoverOpen(false);
                                    }}
                                    className="flex justify-between"
                                  >
                                    <div className="flex items-center">
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            materialId === m.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
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
                      <Input id="quantity" type="number" placeholder="Ej: 100" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="area">Área / Proyecto de Destino</Label>
                      <Input id="area" placeholder="Ej: Torre Norte, Piso 5" value={area} onChange={e => setArea(e.target.value)} disabled={isSubmitting}/>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : "Enviar Solicitud"}
                  </Button>
              </form>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package /> Historial de Solicitudes</CardTitle>
            <CardDescription>Revisa el estado de tus solicitudes de materiales de bodega.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {myRequests.length > 0 ? (
                        myRequests.map((req) => {
                            const material = materials.find(m => m.id === req.materialId);
                            return (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium max-w-xs truncate">{material?.name || 'N/A'}</TableCell>
                                <TableCell>{req.quantity}</TableCell>
                                <TableCell className="max-w-[100px] truncate">{req.area}</TableCell>
                                <TableCell>{getDate(req.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>{getStatusBadge(req.status)}</TableCell>
                            </TableRow>
                            )
                        })
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
