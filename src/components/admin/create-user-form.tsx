
'use client';
import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import type { UserRole } from '@/lib/data';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  role: z.enum(['admin', 'supervisor', 'worker', 'operations'], { required_error: 'Debes seleccionar un rol.' }),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateUserForm() {
  const { addUser } = useAppState();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      role: 'worker',
    }
  });
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Jefe de Operaciones';
        default: return 'Usuario';
    }
  }


  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addUser(data.name, data.role);
      toast({
        title: 'Usuario Creado',
        description: `${data.name} ha sido añadido como ${getRoleDisplayName(data.role)}.`,
      });
      reset();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el usuario.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre Completo</Label>
        <Input id="name" placeholder="Ej: Maria Rodriguez" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Rol del Usuario</Label>
        <Controller
            name="role"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="operations">Jefe de Operaciones</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="worker">Colaborador</SelectItem>
                    </SelectContent>
                </Select>
            )}
        />
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Crear Usuario
      </Button>
    </form>
  );
}