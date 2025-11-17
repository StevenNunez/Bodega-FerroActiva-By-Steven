
"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/modules/core/hooks/use-toast";
import { PackagePlus, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Unit, MaterialCategory, Material } from "@/modules/core/lib/data";


const FormSchema = z.object({
  isNewMaterial: z.boolean().default(false),
  materialId: z.string().optional(),
  name: z.string().optional(),
  unit: z.string().optional(),
  categoryId: z.string().optional(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  justification: z.string().min(5, "La justificación es requerida (mín. 5 caracteres)."),
}).refine(data => {
    if (data.isNewMaterial) {
        return data.name && data.name.length >= 3 && data.unit && data.unit.length > 0 && data.categoryId;
    }
    return !!data.materialId;
}, {
    message: "Completa los campos requeridos para el material.",
    path: ['isNewMaterial'],
});

type FormData = z.infer<typeof FormSchema>;

export default function ManualStockEntryPage() {
  const { materials, addManualStockEntry, addMaterial, materialCategories, units } = useAppState();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  const [isNewMaterial, setIsNewMaterial] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      isNewMaterial: false,
    }
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
        if (data.isNewMaterial) {
            if (!data.name || !data.unit || !data.categoryId) {
                 toast({ variant: "destructive", title: "Error", description: "Nombre, unidad y categoría son requeridos para un nuevo material." });
                 return;
            }
            await addMaterial({
                name: data.name,
                stock: data.quantity,
                unit: data.unit,
                categoryId: data.categoryId,
                supplierId: null,
                justification: data.justification,
            });
            toast({ title: "Éxito", description: "El nuevo material ha sido creado y el stock inicial registrado." });
        } else {
            if (!data.materialId) {
                toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un material existente." });
                return;
            }
            await addManualStockEntry(data.materialId, data.quantity, data.justification);
            toast({ title: "Éxito", description: "El ingreso de stock ha sido registrado correctamente." });
        }
      reset({ materialId: undefined, quantity: 0, justification: "", name: "", unit: "", categoryId: "", isNewMaterial: false });
      setIsNewMaterial(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el ingreso.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ingreso Manual de Stock"
        description="Registra el ingreso de stock para materiales existentes que no provienen de una orden de compra, o crea un nuevo material."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Registrar Ingreso Manual</CardTitle>
          <CardDescription>
            Usa el interruptor para elegir entre añadir stock a un material existente o crear uno nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="flex items-center space-x-2">
                <Switch 
                    id="isNewMaterial" 
                    checked={isNewMaterial}
                    onCheckedChange={(checked) => {
                        setIsNewMaterial(checked);
                        setValue('isNewMaterial', checked);
                        reset({ materialId: undefined, name: "", unit: "", categoryId: "", quantity: 0, justification: "" });
                    }}
                />
                <Label htmlFor="isNewMaterial">Crear Nuevo Material</Label>
            </div>

            {isNewMaterial ? (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Nuevo Material</Label>
                        <Input id="name" placeholder="Ej: Plancha de OSB 9mm" {...register('name')} />
                         {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                            <Label htmlFor="unit">Unidad</Label>
                            <Controller
                                name="unit"
                                control={control}
                                render={({ field }) => (
                                <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                        <span className="truncate">{field.value || "Selecciona..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                        <CommandInput 
                                            placeholder="Buscar o crear..."
                                            onValueChange={(val) => setValue('unit', val, { shouldValidate: true })}
                                            value={field.value || ''}
                                        />
                                        <CommandList>
                                            <CommandEmpty><Button className="w-full" variant="outline" onClick={() => setUnitPopoverOpen(false)}>Usar "{field.value}"</Button></CommandEmpty>
                                            <CommandGroup>
                                            {(units || []).map((u: Unit) => (
                                                <CommandItem key={u.id} value={u.name} onSelect={() => { setValue("unit", u.name, { shouldValidate: true }); setUnitPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", field.value === u.name ? "opacity-100" : "opacity-0")} />
                                                {u.name}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                        </Command>
                                    </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categoryId">Categoría</Label>
                             <Controller
                                name="categoryId"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                        <SelectContent>
                                            {(materialCategories || []).map((cat: MaterialCategory) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                             {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-2">
                <Label htmlFor="materialId">Material Existente</Label>
                <Controller
                    name="materialId"
                    control={control}
                    render={({ field }) => (
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            <span className="truncate">
                            {field.value
                                ? (materials || []).find((m: Material) => m.id === field.value)?.name
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
                                    setValue("materialId", m.id, { shouldValidate: true });
                                    setPopoverOpen(false);
                                    }}
                                    className="flex justify-between"
                                >
                                    <div className="flex items-center">
                                    <Check
                                        className={cn("mr-2 h-4 w-4", field.value === m.id ? "opacity-100" : "opacity-0")}
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
                    )}
                />
                {errors.materialId && (
                    <p className="text-xs text-destructive">{errors.materialId.message}</p>
                )}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad a Ingresar</Label>
                <Input
                    id="quantity"
                    type="number"
                    placeholder="Ej: 50"
                    {...register("quantity")}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justificación del Ingreso</Label>
              <Textarea
                id="justification"
                placeholder="Ej: Ajuste de inventario, encontrado en bodega, compra directa."
                {...register("justification")}
              />
              {errors.justification && (
                <p className="text-xs text-destructive">{errors.justification.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-2 h-4 w-4" />
              )}
               Registrar Ingreso de Stock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    