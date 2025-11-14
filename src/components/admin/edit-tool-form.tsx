'use client';
import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { useToast } from '@/modules/core/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { Tool } from '@/modules/core/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

const FormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
});

type FormData = z.infer<typeof FormSchema>;

interface EditToolFormProps {
    tool: Tool;
    isOpen: boolean;
    onClose: () => void;
}

export function EditToolForm({ tool, isOpen, onClose }: EditToolFormProps) {
  const { updateTool } = useAppState();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
        name: tool.name,
    }
  });

  useEffect(() => {
      if(tool) {
          reset({
            name: tool.name,
          });
      }
  }, [tool, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await updateTool(tool.id, data);
      toast({
        title: 'Herramienta Actualizada',
        description: `El nombre de la herramienta ha sido guardado.`,
      });
      onClose();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la herramienta.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Editar Herramienta</DialogTitle>
                <DialogDescription>
                    Modifica el nombre de la herramienta. El código QR no cambiará.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="tool-name">Nombre de la Herramienta</Label>
                    <Input id="tool-name" placeholder="Ej: Martillo de bola" {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="tool-qrcode">Código QR</Label>
                    <Input id="tool-qrcode" value={tool.qrCode} disabled />
                </div>
                
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
