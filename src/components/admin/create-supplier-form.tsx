
'use client';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Briefcase, PlusCircle, X, Check } from 'lucide-react';
import { MATERIAL_CATEGORIES } from '@/lib/data';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  categories: z.array(z.string()).nonempty('Debes seleccionar al menos una categoría.'),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateSupplierForm() {
  const { addSupplier } = useAppState();
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
      name: "",
      categories: [],
    }
  });

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    setValue('categories', newCategories, { shouldValidate: true });
  };
  
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addSupplier(data.name, data.categories);
      toast({
        title: 'Proveedor Creado',
        description: `${data.name} ha sido añadido al sistema.`,
      });
      reset();
      setSelectedCategories([]);
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el proveedor.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Proveedor</Label>
        <Input id="name" placeholder="Ej: Ferretería El Clavo" {...register('name')} />
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
                            {MATERIAL_CATEGORIES.map(cat => (
                                <CommandItem
                                    key={cat}
                                    value={cat}
                                    onSelect={() => handleCategoryToggle(cat)}
                                    className="flex items-center justify-between"
                                >
                                    <span>{cat}</span>
                                    {selectedCategories.includes(cat) && <Check className="h-4 w-4 text-primary"/>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
         </Popover>
         {errors.categories && <p className="text-xs text-destructive">{errors.categories.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Briefcase className="mr-2 h-4 w-4" />
        )}
        Crear Proveedor
      </Button>
    </form>
  );
}
