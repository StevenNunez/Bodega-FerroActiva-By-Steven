
'use client';
import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ThumbsDown, ThumbsUp } from 'lucide-react';
import { PurchaseRequest } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const FormSchema = z.object({
  materialName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

interface EditPurchaseRequestFormProps {
    request: PurchaseRequest;
    isOpen: boolean;
    onClose: () => void;
}

export function EditPurchaseRequestForm({ request, isOpen, onClose }: EditPurchaseRequestFormProps) {
  const { updatePurchaseRequestStatus } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  useEffect(() => {
      if(request) {
          reset({
            materialName: request.materialName,
            quantity: request.quantity,
            notes: request.notes || '',
          });
      }
  }, [request, reset]);

  const handleAction = async (status: 'approved' | 'rejected', data?: FormData) => {
    try {
        if (status === 'approved' && data) {
             await updatePurchaseRequestStatus(request.id, 'approved', {
                materialName: data.materialName,
                quantity: data.quantity,
                notes: data.notes
            });
            toast({
                title: 'Solicitud Aprobada',
                description: `La solicitud para ${data.materialName} ha sido aprobada.`,
            });
        } else {
             await updatePurchaseRequestStatus(request.id, 'rejected');
             toast({
                title: 'Solicitud Rechazada',
                variant: 'destructive'
            });
        }
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo procesar la solicitud.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Gestionar Solicitud de Compra</DialogTitle>
                <DialogDescription>
                    Revisa, ajusta y aprueba o rechaza la solicitud.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit((data) => handleAction('approved', data))} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="materialName">Nombre del Material</Label>
                    <Input id="materialName" {...register('materialName')} />
                    {errors.materialName && <p className="text-xs text-destructive">{errors.materialName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input id="quantity" type="number" {...register('quantity')} />
                        {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Input value={request.unit} disabled />
                    </div>
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea id="notes" placeholder="Ej: Ajustado a cantidad por caja, cambiado a marca XXX." {...register('notes')} />
                    <p className="text-xs text-muted-foreground">Esta nota será visible para el solicitante.</p>
                </div>


                <DialogFooter className="grid grid-cols-2 gap-2 pt-4">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" className="w-full">
                                <ThumbsDown className="mr-2 h-4 w-4"/> Rechazar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Rechazo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción marcará la solicitud de compra como rechazada. ¿Estás seguro?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAction('rejected')} className="bg-destructive hover:bg-destructive/90">
                                Sí, Rechazar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
                        Aprobar
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
