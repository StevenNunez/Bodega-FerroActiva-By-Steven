"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, ChevronsUpDown, Check, Clock, Package, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SupervisorRequestPage() {
  const { materials, addRequest, requests, isLoading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [area, setArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const myRequests = useMemo(() => requests.filter((r) => r.supervisorId === authUser?.id), [requests, authUser]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return myRequests;
    return myRequests.filter((r) => r.status === statusFilter);
  }, [myRequests, statusFilter]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !quantity || !area || !authUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, completa todos los campos: material, cantidad y área.",
      });
      return;
    }

    const selectedMaterial = materialMap.get(materialId);
    if (!selectedMaterial) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El material seleccionado no es válido.",
      });
      return;
    }

    const requestedQuantity = parseInt(quantity);
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La cantidad debe ser un número mayor que 0.",
      });
      return;
    }

    if (selectedMaterial.stock <= 0) {
      toast({
        variant: "destructive",
        title: "Error de Stock",
        description: `El material "${selectedMaterial.name}" no tiene stock disponible.`,
      });
      return;
    }

    if (requestedQuantity > selectedMaterial.stock) {
      toast({
        variant: "destructive",
        title: "Stock Insuficiente",
        description: `Solo quedan ${selectedMaterial.stock} unidades de "${selectedMaterial.name}".`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addRequest({
        materialId,
        quantity: requestedQuantity,
        area,
        supervisorId: authUser.id,
      });
      toast({
        title: "Éxito",
        description: "Tu solicitud de material ha sido enviada.",
      });
      setMaterialId("");
      setQuantity("");
      setArea("");
      setPopoverOpen(false);
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-label="Seleccionar material"
                      aria-describedby="material-description"
                      className="w-full justify-between"
                      disabled={isSubmitting}
                    >
                      <span className="truncate">
                        {materialId
                          ? materialMap.get(materialId)?.name ?? "N/A"
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
                              disabled={m.stock <= 0}
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
                <span id="material-description" className="sr-only">
                  Selecciona un material de la lista o busca por nombre
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Ej: 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                  aria-label="Cantidad de material"
                />
              </div>
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
                        <TableHead className="w-[200px]">Material</TableHead>
                        <TableHead className="w-[100px]">Cantidad</TableHead>
                        <TableHead className="w-[150px]">Área</TableHead>
                        <TableHead className="w-[150px]">Fecha</TableHead>
                        <TableHead className="w-[150px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.length > 0 ? (
                        paginatedRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {materialMap.get(req.materialId)?.name ?? "N/A"}
                            </TableCell>
                            <TableCell>{req.quantity}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{req.area}</TableCell>
                            <TableCell>{formatDate(req.createdAt)}</TableCell>
                            <TableCell>{getStatusBadge(req.status)}</TableCell>
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