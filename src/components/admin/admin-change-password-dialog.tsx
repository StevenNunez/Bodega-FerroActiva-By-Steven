'use client';
import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/modules/core/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { User } from '@/modules/core/lib/data';


// This function simulates a call to a secure backend (like a Firebase Cloud Function)
// which is required to change another user's password.
// The client-side Firebase SDK does NOT allow changing another user's password for security reasons.
async function simulateAdminPasswordReset(targetUserId: string, newPasswordForTarget: string) {
    console.warn("--- SIMULATING ADMIN PASSWORD RESET ---");
    console.warn(`This is a client-side simulation. In a real production environment, this would trigger a secure backend function (e.g., Firebase Cloud Function) to perform the password change for user ${targetUserId}.`);
    console.warn(`New password would be: "${newPasswordForTarget}"`);
    console.warn("---------------------------------------");
    // In a real scenario, you would await a call to your backend API here.
    // e.g., await fetch('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ userId, newPassword }) });
    return Promise.resolve();
}


const FormSchema = z.object({
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof FormSchema>;

interface AdminChangePasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit: User;
}

export function AdminChangePasswordDialog({ isOpen, onClose, userToEdit }: AdminChangePasswordDialogProps) {
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
        // This is where the call to the secure backend function would go.
        await simulateAdminPasswordReset(userToEdit.id, data.newPassword);
        
        toast({
            title: 'Funcionalidad no disponible en prototipo',
            description: `En un entorno de producción, la contraseña de ${userToEdit.name} habría sido cambiada. Esta acción requiere un backend seguro (Cloud Function) para ejecutarse.`,
            variant: 'destructive',
            duration: 10000
        });
        
        onClose();
    } catch (error: any) {
       toast({
            variant: 'destructive',
            title: 'Error de Simulación',
            description: error.message || 'No se pudo completar la simulación.',
       });
    }
  };

  const handleClose = () => {
      reset();
      onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Restablecer Contraseña para {userToEdit.name}</DialogTitle>
                <DialogDescription>
                    Establece una nueva contraseña para este usuario. Esta acción es una simulación de una funcionalidad de backend segura. En un entorno real, la contraseña se cambiaría y se lo deberías comunicar al usuario.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                
                <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" {...register('newPassword')} />
                    {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Save className="mr-2 h-4 w-4" />
                        )}
                        Establecer Contraseña
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
