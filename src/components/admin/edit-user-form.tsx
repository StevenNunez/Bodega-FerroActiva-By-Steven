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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';


const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  role: z.enum(['admin', 'supervisor', 'worker', 'operations', 'apr', 'guardia', 'finance'], { required_error: 'Debes seleccionar un rol.' }),
  rut: z.string().optional(),
  cargo: z.string().optional(),
  fechaIngreso: z.date().optional(),
  afp: z.string().optional(),
  tipoSalud: z.enum(['Fonasa', 'Isapre']).optional(),
  cargasFamiliares: z.coerce.number().optional(),
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
  });

  useEffect(() => {
      if(user) {
          reset({
            name: user.name,
            role: user.role,
            rut: user.rut || '',
            cargo: user.cargo || '',
            fechaIngreso: user.fechaIngreso ? (user.fechaIngreso as Timestamp).toDate() : undefined,
            afp: user.afp || '',
            tipoSalud: user.tipoSalud,
            cargasFamiliares: user.cargasFamiliares || 0,
          });
      }
  }, [user, reset]);
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Jefe de Bodega';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Administrador de Obra';
        case 'apr': return 'APR';
        case 'guardia': return 'Guardia';
        case 'finance': return 'Jefe de Adm. y Finanzas';
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
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Editar Perfil de Usuario</DialogTitle>
                <DialogDescription>
                    Modifica los datos personales y previsionales del usuario.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-6">
                <h4 className="font-semibold text-lg border-b pb-2">Información General</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-name">Nombre Completo</Label>
                        <Input id="user-name" placeholder="Ej: Juan Pérez" {...register('name')} />
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
                                        <SelectItem value="operations">Administrador de Obra</SelectItem>
                                        <SelectItem value="admin">Jefe de Bodega</SelectItem>
                                        <SelectItem value="finance">Jefe de Adm. y Finanzas</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="apr">APR</SelectItem>
                                        <SelectItem value="guardia">Guardia</SelectItem>
                                        <SelectItem value="worker">Colaborador</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="user-email">Correo Electrónico</Label>
                    <Input id="user-email" type="email" value={user.email} disabled />
                </div>
                
                 <h4 className="font-semibold text-lg border-b pb-2 pt-6">Información para Planilla</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="rut">RUT</Label>
                        <Input id="rut" placeholder="12.345.678-9" {...register('rut')} />
                        {errors.rut && <p className="text-xs text-destructive">{errors.rut.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo</Label>
                        <Input id="cargo" placeholder="Ej: Maestro Carpintero" {...register('cargo')} />
                        {errors.cargo && <p className="text-xs text-destructive">{errors.cargo.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
                        <Controller
                            name="fechaIngreso"
                            control={control}
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                         {errors.fechaIngreso && <p className="text-xs text-destructive">{errors.fechaIngreso.message}</p>}
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="afp">AFP</Label>
                        <Input id="afp" placeholder="Ej: Modelo" {...register('afp')} />
                        {errors.afp && <p className="text-xs text-destructive">{errors.afp.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tipoSalud">Sistema de Salud</Label>
                         <Controller
                            name="tipoSalud"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="tipoSalud">
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Fonasa">Fonasa</SelectItem>
                                        <SelectItem value="Isapre">Isapre</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.tipoSalud && <p className="text-xs text-destructive">{errors.tipoSalud.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="cargasFamiliares">Cargas Familiares</Label>
                        <Input id="cargasFamiliares" type="number" {...register('cargasFamiliares')} />
                        {errors.cargasFamiliares && <p className="text-xs text-destructive">{errors.cargasFamiliares.message}</p>}
                    </div>
                </div>

                <DialogFooter className="pt-6">
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
