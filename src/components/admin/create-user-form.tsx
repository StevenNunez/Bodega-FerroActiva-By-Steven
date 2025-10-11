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
import { nanoid } from 'nanoid';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: z.enum(['admin', 'supervisor', 'worker', 'operations', 'apr', 'guardia'], { required_error: 'Debes seleccionar un rol.' }),
});

type FormData = z.infer<typeof FormSchema>;

export function CreateUserForm() {
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
      email: "",
      password: "",
      role: 'worker',
    }
  });
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Jefe de Bodega';
        case 'supervisor': return 'Supervisor';
        case 'worker': return 'Colaborador';
        case 'operations': return 'Administrador de Obra';
        case 'apr': return 'APR';
        case 'guardia': return 'Guardia';
        default: return 'Usuario';
    }
  }


  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const authUser = userCredential.user;

      const qrCode = `USER-${authUser.uid}`;

      await setDoc(doc(db, "users", authUser.uid), {
          id: authUser.uid,
          name: data.name,
          email: data.email,
          role: data.role,
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
                        <SelectItem value="operations">Administrador de Obra</SelectItem>
                        <SelectItem value="admin">Jefe de Bodega</SelectItem>
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
