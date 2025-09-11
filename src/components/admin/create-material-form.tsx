'use client';
import React, { useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, PackagePlus } from 'lucide-react';
import { PURCHASE_UNITS, MATERIAL_CATEGORIES, Supplier } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo.'),
  unit: z.string({ required_error: 'Debes seleccionar una unidad.' }),
  category: z.string({ required_error: 'Debes seleccionar una categoría.' }),
  supplierId: z.string().nullable(),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateMaterialForm() {
  const { addMaterial, suppliers } = useAppState();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      stock: 0,
      supplierId: null,
    }
  });

  const categoryWatcher = watch('category');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addMaterial({
          ...data,
          supplierId: data.supplierId === 'ninguno' ? null : data.supplierId
      });
      toast({
        title: 'Material Creado',
        description: `${data.name} ha sido añadido y su ingreso ha sido registrado.`,
      });
      reset();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el material.',
      });
    }
  };
  
  const filteredSuppliers = React.useMemo(() => {
      if (!categoryWatcher) return suppliers;
      return suppliers.filter(s => s.categories.includes(categoryWatcher));
  }, [suppliers, categoryWatcher]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="material-name">Nombre del Material</Label>
        <Input id="material-name" placeholder="Ej: Tornillos de 1 pulgada" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      
       <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="stock">Stock Inicial</Label>
                <Input id="stock" type="number" placeholder="Ej: 500" {...register('stock')} />
                {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
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
                                {PURCHASE_UNITS.map(unit => (
                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
       </div>

        <div className="space-y-2">
            <Label htmlFor="category">Categoría del Material</Label>
                <Controller
                name="category"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            {MATERIAL_CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
        </div>
        
         <div className="space-y-2">
            <Label htmlFor="supplierId">Proveedor Preferido (Opcional)</Label>
            <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!categoryWatcher}>
                    <SelectTrigger id="supplierId">
                        <SelectValue placeholder={!categoryWatcher ? "Primero elige una categoría" : "Selecciona un proveedor"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ninguno">Ninguno</SelectItem>
                        {filteredSuppliers.map((s: Supplier) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            />
            <p className="text-xs text-muted-foreground">Se sugieren proveedores según la categoría del material.</p>
            {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
        </div>


      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PackagePlus className="mr-2 h-4 w-4" />
        )}
        Crear Material y Registrar Ingreso
      </Button>
    </form>
  );
}
