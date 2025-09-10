
"use client";

import React from "react";
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Clock, Check, X, PackageCheck, Package, Box, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PurchaseRequestStatus, MATERIAL_CATEGORIES, PURCHASE_UNITS } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timestamp } from "firebase/firestore";


const FormSchema = z.object({
  materialName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  unit: z.string({ required_error: 'Debes seleccionar una unidad.' }),
  justification: z.string().min(10, 'La justificación debe tener al menos 10 caracteres.'),
  category: z.string({ required_error: 'Debes seleccionar una categoría.' }),
  area: z.string().min(3, 'El área/proyecto debe tener al menos 3 caracteres.'),
});

type FormData = z.infer<typeof FormSchema>;

export default function AprPurchaseRequestPage() {
  const { purchaseRequests, addPurchaseRequest } = useAppState();
  const { user: authUser } = useAuth();
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

  const myRequests = purchaseRequests.filter(pr => pr.supervisorId === authUser?.id);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!authUser) {
        toast({ variant: 'destructive', title: 'Error de autenticación' });
        return;
    }
    try {
      await addPurchaseRequest({
        ...data,
        supervisorId: authUser.id,
      });
      toast({ title: 'Éxito', description: 'Tu solicitud de compra ha sido enviada.' });
      reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la solicitud.' });
    }
  };
  
  const getStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      case 'received':
        return <Badge variant="default" className="bg-blue-600 text-white"><PackageCheck className="mr-1 h-3 w-3" />Recibido</Badge>;
      case 'batched':
        return <Badge variant="default" className="bg-purple-600 text-white"><Box className="mr-1 h-3 w-3" />En Lote</Badge>;
       case 'ordered':
        return <Badge variant="default" className="bg-cyan-600 text-white"><FileText className="mr-1 h-3 w-3" />Orden Generada</Badge>;
    }
  };

  const getDate = (date: Date | Timestamp) => {
      return date instanceof Timestamp ? date.toDate() : date;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Solicitar Compra de Materiales"
        description="Pide materiales que no están en el inventario o cuyo stock es bajo."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generar Solicitud de Compra</CardTitle>
            <CardDescription>Completa el formulario para pedir nuevos materiales. El Jefe de Operaciones deberá aprobar la compra.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="materialName">Nombre del Material</Label>
                    <Input id="materialName" placeholder="Ej: Cemento Portland 25kg" {...register('materialName')} />
                    {errors.materialName && <p className="text-xs text-destructive">{errors.materialName.message}</p>}
                  </div>

                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input id="quantity" type="number" placeholder="Ej: 50" {...register('quantity')} />
                        {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="unit">Unidad</Label>
                        <Controller
                            name="unit"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="unit">
                                        <SelectValue placeholder="Unidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PURCHASE_UNITS.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
                    </div>
                 </div>

                   <div className="space-y-2">
                    <Label htmlFor="area">Área / Proyecto</Label>
                    <Input id="area" placeholder="Ej: Torre A, Piso 5" {...register('area')} />
                    {errors.area && <p className="text-xs text-destructive">{errors.area.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría del Material</Label>
                     <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MATERIAL_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                  </div>
              </div>
              
               <div className="space-y-2">
                <Label htmlFor="justification">Justificación de la Compra</Label>
                <Textarea id="justification" placeholder="Ej: Necesario para la fase 2 de la estructura." {...register('justification')} />
                {errors.justification && <p className="text-xs text-destructive">{errors.justification.message}</p>}
              </div>


              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Historial de Solicitudes de Compra</CardTitle>
            <CardDescription>El estado de tus solicitudes se actualizará aquí una vez gestionadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.length > 0 ? (
                      myRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium max-w-xs truncate">{req.materialName}</TableCell>
                          <TableCell>{req.quantity} {req.unit}</TableCell>
                          <TableCell>{getDate(req.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No has realizado solicitudes de compra.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
