
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/modules/core/hooks/use-toast";
import {
  Send,
  Loader2,
  Clock,
  Check,
  X,
  PackageCheck,
  Box,
  FileText,
  AlertCircle,
  ChevronsUpDown,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PurchaseRequestStatus, PurchaseRequest, Material, MaterialCategory } from "@/modules/core/lib/data";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timestamp } from "firebase/firestore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const PURCHASE_UNITS = ["unidad", "caja", "m2", "m3", "litro", "kg", "tonelada"];

const FormSchema = z.object({
  materialName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  unit: z.string({ required_error: 'Debes seleccionar una unidad.' }),
  justification: z.string().min(10, 'La justificación debe tener al menos 10 caracteres.'),
  category: z.string({ required_error: 'Debes seleccionar una categoría.' }),
  area: z.string().min(3, 'El área/proyecto debe tener al menos 3 caracteres.'),
});

type FormData = z.infer<typeof FormSchema>;

export default function PurchaseRequestFormPage() {
  const { purchaseRequests, materials, addPurchaseRequest, materialCategories } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : new Date(date as any);
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (selectedMaterialId) {
      const material = (materials || []).find((m: Material) => m.id === selectedMaterialId);
      if (material) {
        setValue("materialName", material.name, { shouldValidate: true });
        setValue("unit", material.unit, { shouldValidate: true });
        setValue("category", material.category, { shouldValidate: true });
      }
    }
  }, [selectedMaterialId, materials, setValue]);

  const displayedRequests = useMemo(() => {
    if (!authUser) return [];
    return (purchaseRequests || [])
      .filter((pr: PurchaseRequest) => pr.supervisorId === authUser.id)
      .sort((a: PurchaseRequest, b: PurchaseRequest) => {
        const dateA = getDate(a.createdAt);
        const dateB = getDate(b.createdAt);
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        return 0;
      });
  }, [purchaseRequests, authUser]);

  const paginatedRequests = displayedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(displayedRequests.length / itemsPerPage);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!authUser) {
      toast({ variant: 'destructive', title: 'Error de autenticación' });
      return;
    }
    try {
      await addPurchaseRequest({
        ...data,
        supervisorId: authUser.id,
      });
      toast({
        title: 'Éxito',
        description: 'Tu solicitud de compra ha sido enviada.',
      });
      reset();
      setSelectedMaterialId(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la solicitud.',
      });
    }
  };

  const getStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="mr-1 h-3 w-3" /> Pendiente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <Check className="mr-1 h-3 w-3" /> Aprobado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" /> Rechazado
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="default" className="bg-blue-600 text-white">
            <PackageCheck className="mr-1 h-3 w-3" /> Recibido
          </Badge>
        );
      case 'batched':
        return (
          <Badge variant="default" className="bg-purple-600 text-white">
            <Box className="mr-1 h-3 w-3" /> En Lote
          </Badge>
        );
      case 'ordered':
        return (
          <Badge variant="default" className="bg-cyan-600 text-white">
            <FileText className="mr-1 h-3 w-3" /> Orden Generada
          </Badge>
        );
      default:
         return <Badge variant="outline">Desconocido</Badge>
    }
  };

  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
      return `Cantidad original: ${req.originalQuantity}. ${req.notes || ''}`;
    }
    if (req.notes) {
      return req.notes;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Solicitar Compra de Materiales"
        description="Pide materiales que no están en el inventario o cuyo stock es bajo."
      />

      <div className="flex flex-col gap-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Generar Solicitud de Compra</CardTitle>
            <CardDescription>Completa el formulario para pedir nuevos materiales.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar material existente (Opcional)</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">
                        {selectedMaterialId
                          ? (materials || []).find((m: Material) => m.id === selectedMaterialId)?.name
                          : "Selecciona un material..."}
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
                              onSelect={() => {
                                setSelectedMaterialId(m.id);
                                setPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedMaterialId === m.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {m.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materialName">Nombre del Material</Label>
                  <Input
                    id="materialName"
                    placeholder="Ej: Cemento Portland 25kg"
                    {...register('materialName')}
                  />
                  {errors.materialName && (
                    <p className="text-xs text-destructive">{errors.materialName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Ej: 50"
                      {...register('quantity')}
                    />
                    {errors.quantity && (
                      <p className="text-xs text-destructive">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Controller
                      name="unit"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="unit">
                            <SelectValue placeholder="Unidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {PURCHASE_UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.unit && (
                      <p className="text-xs text-destructive">{errors.unit.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Área / Proyecto</Label>
                  <Input id="area" placeholder="Ej: Torre A, Piso 5" {...register('area')} />
                  {errors.area && (
                    <p className="text-xs text-destructive">{errors.area.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría del Material</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between">
                            <span className="truncate">
                              {field.value
                                ? (materialCategories || []).find((cat: MaterialCategory) => cat.name === field.value)?.name
                                : "Selecciona una categoría..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar categoría..." />
                            <CommandList>
                              <CommandEmpty>No se encontró la categoría.</CommandEmpty>
                              <CommandGroup>
                                {(materialCategories || []).map((cat: MaterialCategory) => (
                                  <CommandItem
                                    key={cat.id}
                                    value={cat.name}
                                    onSelect={() => {
                                      setValue("category", cat.name, { shouldValidate: true });
                                      setCategoryPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === cat.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="justification">Justificación de la Compra</Label>
                <Textarea
                  id="justification"
                  placeholder="Ej: Necesario para la fase 2 de la estructura."
                  {...register('justification')}
                />
                {errors.justification && (
                  <p className="text-xs text-destructive">{errors.justification.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Enviar Solicitud
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Historial de Mis Solicitudes</CardTitle>
            <CardDescription>El estado de tus solicitudes se actualiza aquí.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(80vh-12rem)]">
              <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">Material</TableHead>
                        <TableHead className="min-w-[120px]">Cant.</TableHead>
                        <TableHead className="min-w-[150px]">Fecha</TableHead>
                        <TableHead className="min-w-[150px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.length > 0 ? (
                        paginatedRequests.map((req: PurchaseRequest) => {
                          const changeTooltip = getChangeTooltip(req);
                          return (
                            <TableRow key={req.id}>
                              <TableCell className="font-medium min-w-[300px] whitespace-pre-wrap break-words">
                                {req.materialName}
                              </TableCell>
                              <TableCell className="flex items-center gap-2 min-w-[120px]">
                                {req.quantity} {req.unit}
                                {changeTooltip && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">{changeTooltip}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                              <TableCell className="min-w-[150px]">
                                {getDate(req.createdAt)?.toLocaleDateString() ?? 'N/A'}
                              </TableCell>
                              <TableCell className="min-w-[150px]">
                                {getStatusBadge(req.status)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No has realizado solicitudes de compra.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
