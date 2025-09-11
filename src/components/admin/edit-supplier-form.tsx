'use client';
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Check } from 'lucide-react';
import { Supplier, MaterialCategory } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  categories: z.array(z.string()).nonempty('Debes seleccionar al menos una categoría.'),
});

type FormData = z.infer<typeof FormSchema>;

interface EditSupplierFormProps {
    supplier: Supplier;
    isOpen: boolean;
    onClose: () => void;
}

export function EditSupplierForm({ supplier, isOpen, onClose }: EditSupplierFormProps) {
  const { updateSupplier, materialCategories } = useAppState();
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(supplier.categories);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
        name: supplier.name,
        categories: supplier.categories,
    }
  });

  useEffect(() => {
    if(supplier) {
        reset({
            name: supplier.name,
            categories: supplier.categories,
        });
        setSelectedCategories(supplier.categories);
    }
  }, [supplier, reset]);

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    setValue('categories', newCategories, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await updateSupplier(supplier.id, data);
      toast({
        title: 'Proveedor Actualizado',
        description: `Los datos de ${data.name} han sido guardados.`,
      });
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el proveedor.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Editar Proveedor</DialogTitle>
                <DialogDescription>
                    Modifica el nombre y las categorías del proveedor.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="supplier-name">Nombre del Proveedor</Label>
                    <Input id="supplier-name" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="categories">Categorías que Maneja</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10">
                                {selectedCategories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedCategories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                                    </div>
                                ) : (
                                    "Seleccionar categorías..."
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar categoría..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró la categoría.</CommandEmpty>
                                    <CommandGroup>
                                        {materialCategories.map((cat: MaterialCategory) => (
                                            <CommandItem
                                                key={cat.id}
                                                value={cat.name}
                                                onSelect={() => handleCategoryToggle(cat.name)}
                                                className="flex items-center justify-between"
                                            >
                                                <span>{cat.name}</span>
                                                {selectedCategories.includes(cat.name) && <Check className="h-4 w-4 text-primary"/>}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {errors.categories && <p className="text-xs text-destructive">{errors.categories.message}</p>}
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
