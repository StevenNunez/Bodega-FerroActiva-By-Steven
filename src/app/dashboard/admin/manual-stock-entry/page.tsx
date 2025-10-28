"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Material } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  materialId: z.string({ required_error: "Debes seleccionar un material." }),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  justification: z.string().min(5, "La justificación es requerida (mín. 5 caracteres)."),
});

type FormData = z.infer<typeof FormSchema>;

export default function ManualStockEntryPage() {
  const { materials, addManualStockEntry } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!authUser) {
      toast({ variant: "destructive", title: "Error", description: "No estás autenticado." });
      return;
    }
    try {
      await addManualStockEntry(data.materialId, data.quantity, data.justification);
      toast({ title: "Éxito", description: "El ingreso de stock ha sido registrado correctamente." });
      reset({ materialId: undefined, quantity: 0, justification: "" });
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
        description="Registra el ingreso de stock para materiales existentes que no provienen de una orden de compra."
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Registrar Ingreso Manual</CardTitle>
          <CardDescription>
            Selecciona un material, indica la cantidad que ingresa a bodega y una justificación clara del movimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                            ? materials.find((m) => m.id === field.value)?.name
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
                            {materials.map((m) => (
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
                placeholder="Ej: Ajuste de inventario, encontrado en bodega."
                {...register("justification")}
              />
              {errors.justification && (
                <p className="text-xs text-destructive">{errors.justification.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <PackagePlus className="mr-2 h-4 w-4" /> Registrar Ingreso de Stock
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
