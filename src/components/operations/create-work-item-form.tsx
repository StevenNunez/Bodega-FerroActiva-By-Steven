
'use client';

import React, { useState, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { useToast } from '@/modules/core/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, ChevronsUpDown, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { WorkItem } from '@/modules/core/lib/data';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  type: z.enum(['project', 'phase', 'subphase', 'activity', 'task']),
  parentId: z.string().nullable(),
  unit: z.string().min(1, "La unidad es requerida."),
  quantity: z.coerce.number().min(0, "La cantidad no puede ser negativa."),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo."),
});

type FormData = z.infer<typeof FormSchema>;

const ITEM_TYPES = [
    { value: 'project', label: 'Proyecto Principal'},
    { value: 'phase', label: 'Partida Principal' },
    { value: 'subphase', label: 'Sub-Partida' },
    { value: 'activity', label: 'Actividad' },
    { value: 'task', label: 'Tarea Específica' },
];

const UNITS = ["m", "m2", "m3", "kg", "ton", "und", "global"];

interface CreateWorkItemFormProps {
    workItems: WorkItem[];
}

export function CreateWorkItemForm({ workItems }: CreateWorkItemFormProps) {
  const { addWorkItem } = useAppState();
  const { getTenantId } = useAuth();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      type: 'phase',
      parentId: null,
      quantity: 0,
      unitPrice: 0,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        throw new Error("No se pudo identificar el proyecto actual.");
      }

      const fullData = {
        ...data,
        status: 'in-progress' as const,
        projectId: tenantId,
      };

      await addWorkItem(fullData);

      toast({
        title: 'Ítem Creado',
        description: `Se ha añadido "${data.name}" a la estructura de la obra.`,
      });
      reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al crear',
        description: error.message || 'No se pudo añadir el ítem.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Partida/Actividad</Label>
        <Input id="name" placeholder="Ej: Fundaciones" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
          <Label htmlFor="parentId">Ítem Padre (opcional)</Label>
            <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                {field.value ? workItems.find(item => item.id === field.value)?.name : "Seleccionar ítem padre..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar ítem..." />
                                <CommandList>
                                    <CommandEmpty>No se encontraron ítems.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => field.onChange(null)}>
                                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                            (Ninguno - Nivel Principal)
                                        </CommandItem>
                                        {workItems.map(item => (
                                            <CommandItem key={item.id} value={item.name} onSelect={() => { field.onChange(item.id); setPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", field.value === item.id ? "opacity-100" : "opacity-0")} />
                                                {item.path} - {item.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            />
      </div>

       <div className="space-y-2">
        <Label htmlFor="type">Tipo de Ítem</Label>
        <Controller
            name="type"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {ITEM_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

       <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input id="quantity" type="number" {...register('quantity')} />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                 <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                         <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="unit"><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent>
                                {UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
      </div>
      
       <div className="space-y-2">
            <Label htmlFor="unitPrice">Precio Unitario</Label>
            <Input id="unitPrice" type="number" {...register('unitPrice')} />
            {errors.unitPrice && <p className="text-xs text-destructive">{errors.unitPrice.message}</p>}
        </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
        Añadir Ítem
      </Button>
    </form>
  );
}
