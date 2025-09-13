
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
import { Loader2, Save } from 'lucide-react';
import { PURCHASE_UNITS, Material, Supplier, MaterialCategory } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo.'),
  unit: z.string({ required_error: 'Debes seleccionar una unidad.' }),
  category: z.string({ required_error: 'Debes seleccionar una categoría.' }),
  supplierId: z.string().nullable(),
});

type FormData = z.infer<typeof FormSchema>;

interface EditMaterialFormProps {
    material: Material;
    isOpen: boolean;
    onClose: () => void;
}

export function EditMaterialForm({ material, isOpen, onClose }: EditMaterialFormProps) {
  const { updateMaterial, suppliers, materialCategories } = useAppState();
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
        name: material.name,
        stock: material.stock,
        unit: material.unit,
        category: material.category,
        supplierId: material.supplierId || null,
    }
  });

  useEffect(() => {
      if(material) {
          reset({
            name: material.name,
            stock: material.stock,
            unit: material.unit,
            category: material.category,
            supplierId: material.supplierId || null,
          });
      }
  }, [material, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await updateMaterial(material.id, {
          ...data,
          supplierId: data.supplierId === 'ninguno' ? null : data.supplierId
      });
      toast({
        title: 'Material Actualizado',
        description: `Los datos de ${data.name} han sido guardados.`,
      });
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el material.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Editar Material</DialogTitle>
                <DialogDescription>
                    Modifica los detalles del material. Haz clic en guardar cuando termines.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="material-name">Nombre del Material</Label>
                    <Input id="material-name" placeholder="Ej: Tornillos de 1 pulgada" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="stock">Stock</Label>
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
                                    {materialCategories.map((cat: MaterialCategory) => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <SelectTrigger id="supplierId">
                                    <SelectValue placeholder="Selecciona un proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ninguno">Ninguno</SelectItem>
                                    {suppliers.map((s: Supplier) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
