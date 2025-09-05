
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useMemo } from "react";
import { Package, Send, Loader2, ChevronsUpDown, Check, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


export default function SupervisorPage() {
  const { materials, addRequest, users, toolLogs, tools } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [stockSearch, setStockSearch] = useState("");
  
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);


  // Tools checked out under this supervisor's responsibility
  const checkedOutToolsUnderSupervisor = toolLogs.filter(log => log.returnDate === null && log.supervisorId === authUser?.id);
  
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


  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Bienvenido, ${authUser?.name}`} description="Gestiona el inventario y las herramientas desde tu panel." />
      

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench /> Herramientas Asignadas al Equipo</CardTitle>
                  <CardDescription>Visualiza las herramientas que están actualmente en uso por los trabajadores bajo tu supervisión.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-48">
                    {checkedOutToolsUnderSupervisor.length > 0 ? (
                    <div className="space-y-2 p-1">
                        {checkedOutToolsUnderSupervisor.map(log => {
                            const tool = tools.find(t => t.id === log.toolId);
                            const worker = users.find(u => u.id === log.workerId);
                            return <div key={log.id} className="text-sm p-2 rounded-md bg-muted flex justify-between items-center">
                                <span><span className="font-semibold">{tool?.name}</span> en posesión de {worker?.name}</span>
                                <Badge variant="destructive">Ocupado</Badge>
                            </div>
                        })}
                    </div>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Ningún trabajador de tu equipo tiene herramientas asignadas.</p>
                    )}
                  </ScrollArea>
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package /> Stock Disponible</CardTitle>
                  <CardDescription>Consulta los materiales disponibles en bodega.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Usa el formulario de la derecha para solicitar materiales. El stock se muestra en el selector.</p>
              </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send /> Solicitar Materiales para la Obra</CardTitle>
              <CardDescription>Pide materiales del stock existente en bodega. El administrador deberá aprobar la solicitud.</CardDescription>
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
                            {materialId
                              ? materials.find((m) => m.id === materialId)?.name
                              : "Selecciona o busca un material"}
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
      </div>

    </div>
  );
}