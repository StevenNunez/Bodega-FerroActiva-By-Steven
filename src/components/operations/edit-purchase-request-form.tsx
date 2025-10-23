
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
import { Loader2, Save, ThumbsDown, ThumbsUp, ChevronsUpDown, Check } from 'lucide-react';
import { PurchaseRequest, Unit } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';


const FormSchema = z.object({
  materialName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  unit: z.string({ required_error: 'La unidad no puede estar vacía.' }).min(1, 'La unidad no puede estar vacía.'),
  justification: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

interface EditPurchaseRequestFormProps {
    request: PurchaseRequest;
    isOpen: boolean;
    onClose: () => void;
}

export function EditPurchaseRequestForm({ request, isOpen, onClose }: EditPurchaseRequestFormProps) {
  const { updatePurchaseRequestStatus, units } = useAppState();
  const { toast } = useToast();
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  useEffect(() => {
      if(request) {
          reset({
            materialName: request.materialName,
            quantity: request.quantity,
            unit: request.unit,
            justification: request.justification,
            notes: request.notes || '',
          });
      }
  }, [request, reset]);

  const handleStatusChange = async (status: 'approved' | 'rejected') => {
      try {
        await updatePurchaseRequestStatus(request.id, status, getValues());
        toast({
            title: status === 'approved' ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
            description: `La solicitud ha sido marcada como ${status === 'approved' ? 'aprobada' : 'rechazada'}.`,
            variant: status === 'rejected' ? 'destructive' : 'default'
        });
        onClose();
      } catch (error) {
           toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo actualizar el estado de la solicitud.',
          });
      }
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
     try {
      await updatePurchaseRequestStatus(request.id, request.status, data);
      toast({
        title: 'Cambios Guardados',
        description: `La solicitud de compra ha sido actualizada.`,
      });
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron guardar los cambios.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { e.preventDefault(); }}>
            <DialogHeader>
                <DialogTitle>Gestionar Solicitud de Compra</DialogTitle>
                <DialogDescription>
                    Revisa, ajusta y aprueba o rechaza la solicitud.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4 py-4">
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
                            <Label htmlFor="unit">Unidad</Label>
                             <Controller
                                name="unit"
                                control={control}
                                render={({ field }) => (
                                     <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                          <span className="truncate">{field.value || "Selecciona..."}</span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                          <CommandInput 
                                            placeholder="Buscar o crear unidad..."
                                            onValueChange={(currentValue) => {
                                              setValue('unit', currentValue, { shouldValidate: true });
                                            }}
                                            value={field.value || ''}
                                          />
                                          <CommandList>
                                            <CommandEmpty>
                                              <Button className="w-full" variant="outline"
                                                onClick={() => {
                                                  setUnitPopoverOpen(false);
                                                }}>
                                                Usar "{field.value}" como nueva unidad
                                              </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                              {units.map((unit) => (
                                                <CommandItem
                                                  key={unit.id}
                                                  value={unit.name}
                                                  onSelect={() => {
                                                    setValue("unit", unit.name, { shouldValidate: true });
                                                    setUnitPopoverOpen(false);
                                                  }}
                                                >
                                                  <Check className={cn("mr-2 h-4 w-4", field.value === unit.name ? "opacity-100" : "opacity-0")} />
                                                  {unit.name}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="justification">Justificación Original</Label>
                        <Textarea id="justification" {...register('justification')} />
                        {errors.justification && <p className="text-xs text-destructive">{errors.justification.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas de Aprobación (Opcional)</Label>
                        <Textarea id="notes" placeholder="Ej: Ajustado a cantidad por caja, cambiado a marca XXX." {...register('notes')} />
                        <p className="text-xs text-muted-foreground">Esta nota será visible para el solicitante.</p>
                    </div>
                </div>

                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full">
                     <div className="flex gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="w-full sm:w-auto">
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
                                    <AlertDialogAction onClick={() => handleStatusChange('rejected')} className="bg-destructive hover:bg-destructive/90">
                                    Sí, Rechazar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button type="button" onClick={() => handleStatusChange('approved')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                             <ThumbsUp className="mr-2 h-4 w-4"/> Aprobar
                        </Button>
                     </div>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
