'use client';
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { useToast } from '@/modules/core/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { Separator } from '../ui/separator';

const FormSchema = z.object({
  tenantName: z.string().min(3, 'El nombre de la empresa es requerido.'),
  tenantId: z.string().min(5, 'El ID (ej. RUT) es requerido y debe ser único.'),
  adminName: z.string().min(3, 'El nombre del administrador es requerido.'),
  adminEmail: z.string().email('El correo del administrador no es válido.'),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateTenantForm() {
  const { addTenant } = useAppState();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await addTenant(data);
      toast({
        title: 'Invitación Enviada',
        description: `El cliente "${data.tenantName}" y su administrador han sido invitados. El administrador debe revisar su correo o intentar iniciar sesión para activar su cuenta.`,
      });
      reset();
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error al crear suscriptor',
        description: error.message || 'No se pudo completar la operación.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Datos de la Empresa</h4>
      <div className="space-y-2">
        <Label htmlFor="tenant-name">Nombre del Cliente / Empresa</Label>
        <Input id="tenant-name" placeholder="Ej: Constructora ACME" {...register('tenantName')} />
        {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
      </div>

       <div className="space-y-2">
        <Label htmlFor="tenant-id">ID Único (RUT de la Empresa)</Label>
        <Input id="tenant-id" placeholder="Ej: 77.777.777-7" {...register('tenantId')} />
        {errors.tenantId && <p className="text-xs text-destructive">{errors.tenantId.message}</p>}
      </div>

      <Separator className="my-6"/>

      <h4 className="text-sm font-medium text-muted-foreground">Primer Usuario Administrador del Cliente</h4>
       <div className="space-y-2">
        <Label htmlFor="adminName">Nombre Completo del Administrador</Label>
        <Input id="adminName" placeholder="Ej: Juan Pérez" {...register('adminName')} />
        {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminEmail">Correo Electrónico del Administrador</Label>
        <Input id="adminEmail" type="email" placeholder="ej: juan.perez@acme.cl" {...register('adminEmail')} />
        {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
      </div>
      
      <Button type="submit" className="w-full pt-6" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Crear Suscriptor e Invitar Admin
      </Button>
    </form>
  );
}
