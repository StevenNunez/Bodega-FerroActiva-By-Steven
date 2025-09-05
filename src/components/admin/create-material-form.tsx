'use client';
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, PackagePlus } from 'lucide-react';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo.'),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateMaterialForm() {
  const { addMaterial } = useAppState();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      stock: 0,
    }
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addMaterial(data.name, data.stock);
      toast({
        title: 'Material Creado',
        description: `${data.name} ha sido añadido con un stock de ${data.stock}.`,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="material-name">Nombre del Material</Label>
        <Input id="material-name" placeholder="Ej: Tornillos de 1 pulgada" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="stock">Stock Inicial</Label>
        <Input id="stock" type="number" placeholder="Ej: 500" {...register('stock')} />
        {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PackagePlus className="mr-2 h-4 w-4" />
        )}
        Crear Material
      </Button>
    </form>
  );
}
