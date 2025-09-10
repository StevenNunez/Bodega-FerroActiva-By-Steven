'use client';
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { User, UserRole } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  role: z.enum(['admin', 'supervisor', 'worker', 'operations', 'apr'], { required_error: 'Debes seleccionar un rol.' }),
});

type FormData = z.infer<typeof FormSchema>;

interface EditUserFormProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

export function EditUserForm({ user, isOpen, onClose }: EditUserFormProps) {
  const { updateUser } = useAppState();
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
        name: user.name,
        role: user.role,
    }
  });

  useEffect(() => {
      if(user) {
          reset({
            name: user.name,
            role: user.role,
          });
      }
  }, [user, reset]);
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Jefe de Operaciones';
        case 'apr': return 'APR';
        default: return 'Usuario';
    }
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await updateUser(user.id, data);
      toast({
        title: 'Usuario Actualizado',
        description: `Los datos de ${data.name} han sido guardados.`,
      });
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el usuario.',
      });
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                    Modifica los detalles del usuario. El email no se puede cambiar.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="user-name">Nombre Completo</Label>
                    <Input id="user-name" placeholder="Ej: Juan Pérez" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="user-email">Correo Electrónico</Label>
                    <Input id="user-email" type="email" value={user.email} disabled />
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
                                    <SelectItem value="apr">APR</SelectItem>
                                    <SelectItem value="worker">Colaborador</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
                </div>

                <DialogFooter>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                      <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                      <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                          <Save className="mr-2 h-4 w-4" />
                          )}
                          Guardar Cambios
                      </Button>
                    </div>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    </>
  );
}
