'use client';
import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import type { UserRole } from '@/lib/data';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { ROLES, PLANS } from '@/lib/permissions';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: z.enum(['admin', 'bodega-admin', 'supervisor', 'worker', 'operations', 'apr', 'guardia', 'finance', 'super-admin'], { required_error: 'Debes seleccionar un rol.' }),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateUserForm() {
  const { toast } = useToast();
  const { currentTenantId, tenants } = useAppState();
  const { user: authUser } = useAuth();
  
  const currentTenant = React.useMemo(() => {
      if (!currentTenantId) return null;
      return tenants.find(t => t.id === currentTenantId || t.tenantId === currentTenantId);
  }, [currentTenantId, tenants]);

  // For now, let's assume a plan. In a real app, this would be dynamic.
  const plan = PLANS.professional; 

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
      email: "",
      password: "",
      role: 'worker',
    }
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    let tenantIdToAssign = currentTenantId;

    if (authUser?.role === 'super-admin' && !tenantIdToAssign) {
        toast({
            variant: 'destructive',
            title: 'Error de Suscriptor',
            description: 'Como Super-Admin, debes seleccionar un suscriptor antes de crear un usuario.',
        });
        return;
    }

    if (authUser?.role !== 'super-admin') {
        tenantIdToAssign = authUser?.tenantId || null;
    }
    
    if (!tenantIdToAssign) {
         toast({
            variant: 'destructive',
            title: 'Error de Suscriptor',
            description: 'No se pudo determinar el suscriptor para este usuario.',
        });
        return;
    }


    try {
      // NOTE: This approach of creating a user client-side with email/password is NOT secure
      // for a multi-tenant admin panel. In a real-world app, this would be handled by a
      // secure backend function (e.g., Firebase Cloud Function) that creates the user.
      // This is a temporary implementation for prototyping.
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newAuthUser = userCredential.user;

      const qrCode = `USER-${newAuthUser.uid}`;

      await setDoc(doc(db, "users", newAuthUser.uid), {
          id: newAuthUser.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          tenantId: tenantIdToAssign,
          qrCode: qrCode,
      });

      toast({
        title: 'Usuario Creado Exitosamente',
        description: `${data.name} ha sido añadido. Comunícale su contraseña para que pueda ingresar.`,
      });
      reset();
      
    } catch (error: any) {
       let errorMessage = 'No se pudo crear el usuario.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'El correo electrónico ya está registrado.';
        }
       toast({
        variant: 'destructive',
        title: 'Error al crear usuario',
        description: errorMessage,
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
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" type="email" placeholder="ej: m.rodriguez@ferroactiva.cl" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      
       <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
                        {plan.allowedRoles.map(roleKey => (
                            <SelectItem key={roleKey} value={roleKey}>
                                {ROLES[roleKey]?.description.split('.')[0] || roleKey}
                            </SelectItem>
                        ))}
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
