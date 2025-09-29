'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { AttendanceLog, User } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const FormSchema = z.object({
  time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'El formato de hora debe ser HH:mm (ej: 08:05 o 17:30).'
    ),
  type: z.enum(['in', 'out'], { required_error: 'Debes seleccionar el tipo.' }),
});

type FormData = z.infer<typeof FormSchema>;

interface EditAttendanceLogDialogProps {
  log: Partial<AttendanceLog> & { forDate?: Date; forUser?: User };
  isOpen: boolean;
  onClose: () => void;
}

export function EditAttendanceLogDialog({
  log,
  isOpen,
  onClose,
}: EditAttendanceLogDialogProps) {
  const { updateAttendanceLog, addManualAttendance } = useAppState();
  const { toast } = useToast();

  const isEditing = Boolean(log.id);

  const originalTimestamp = useMemo(() => {
    if (isEditing && log.timestamp) {
      return log.timestamp instanceof Timestamp
        ? log.timestamp.toDate()
        : new Date(log.timestamp);
    }
    return null;
  }, [isEditing, log.timestamp]);

  const userName = isEditing ? log.userName : log.forUser?.name;

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
    if (!isOpen) return;

    if (isEditing && originalTimestamp) {
      reset({
        time: format(originalTimestamp, 'HH:mm'),
        type: log.type || 'in',
      });
    } else {
      reset({ time: '', type: 'in' });
    }
  }, [isOpen, isEditing, originalTimestamp, log.type, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (isEditing && log.id && originalTimestamp) {
        // --- EDIT MODE ---
        const [hours, minutes] = data.time.split(':');
        const newTimestamp = new Date(originalTimestamp);
        newTimestamp.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

        await updateAttendanceLog(log.id, newTimestamp, data.type, originalTimestamp);
        toast({
          title: 'Registro Actualizado',
          description: `El registro de ${userName} ha sido actualizado.`,
        });
      } else if (!isEditing && log.forUser && log.forDate) {
        // --- CREATE MODE ---
        await addManualAttendance(log.forUser.id, log.forDate, data.time, data.type);
        toast({
          title: 'Registro Añadido',
          description: `Se ha añadido un nuevo registro para ${userName}.`,
        });
      }
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el registro.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar' : 'Añadir'} Registro de Asistencia
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modificando' : 'Añadiendo'} un registro para{' '}
            <span className="font-semibold">{userName}</span>
            {isEditing
              ? ` del ${
                  originalTimestamp ? format(originalTimestamp, 'dd/MM/yyyy') : ''
                }`
              : ` para el día ${
                  log.forDate ? format(log.forDate, 'dd/MM/yyyy') : ''
                }`}
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Hora */}
            <div className="space-y-2">
              <Label htmlFor="time">Hora (formato 24h)</Label>
              <Input id="time" placeholder="HH:mm" {...register('time')} />
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Registro</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          {isEditing && originalTimestamp && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Hora original: {format(originalTimestamp, 'HH:mm:ss')}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
