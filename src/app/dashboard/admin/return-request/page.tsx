"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, Loader2, Undo2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AdminReturnRequestsPage() {
  const { returnRequests, materials, users, approveReturnRequest, can } = useAppState();
  const { toast } = useToast();
  const [confirmingRequestId, setConfirmingRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const pendingReturnRequests = useMemo(() => {
    return returnRequests.filter(req => req.status === 'pending');
  }, [returnRequests]);

  const handleConfirm = async () => {
    if (!confirmingRequestId) return;
    
    setIsSubmitting(true);
    try {
      await approveReturnRequest(confirmingRequestId);
      toast({ title: "Devolución Confirmada", description: "El stock ha sido actualizado correctamente." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo confirmar la devolución.",
      });
    } finally {
      setIsSubmitting(false);
      setConfirmingRequestId(null);
    }
  };

  const getStatusBadge = (status: "pending" | "approved") => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-600 text-white">
            <Clock className="mr-1 h-3 w-3" /> Pendiente de Confirmación
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-700 text-white">
            <Check className="mr-1 h-3 w-3" /> Recibido
          </Badge>
        );
    }
  };

  const formatTableDate = (date: Date | Timestamp | undefined | null) => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A";
  };
  
  if (!can('stock:add_manual')) {
    return (
        <PageHeader title="Acceso Denegado" description="No tienes permiso para gestionar devoluciones." />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestionar Devoluciones de Materiales"
        description="Confirma la recepción de materiales devueltos por los supervisores para actualizar el stock."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Undo2 /> Solicitudes de Devolución Pendientes</CardTitle>
          <CardDescription>
            Revisa y confirma la recepción de los materiales para que vuelvan al inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] border rounded-md">
            <div className="p-4 space-y-4">
              {pendingReturnRequests.length > 0 ? (
                pendingReturnRequests.map((req) => (
                  <div key={req.id} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-grow">
                      <ul className="list-disc list-inside space-y-1">
                        {req.items.map((item, index) => (
                          <li key={index} className="text-sm font-medium">
                            <span className="font-semibold">{materialMap.get(item.materialId)?.name || "Material desconocido"}</span>
                            <span className="text-primary"> ({item.quantity} uds)</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        Solicitado por: <span className="font-medium">{userMap.get(req.supervisorId) || "Usuario desconocido"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Justificación: <span className="italic">"{req.justification}"</span>
                      </p>
                       <p className="text-xs text-muted-foreground mt-1">
                        Fecha Solicitud: {formatTableDate(req.createdAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 self-center">
                       <AlertDialog open={confirmingRequestId === req.id} onOpenChange={(open) => !open && setConfirmingRequestId(null)}>
                           <AlertDialogTrigger asChild>
                             <Button size="sm" onClick={() => setConfirmingRequestId(req.id)} className="bg-green-600 hover:bg-green-700">
                                Confirmar Recepción
                            </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Devolución</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        ¿Confirmas que has recibido estos materiales en la bodega? El stock se actualizará. Esta acción no se puede deshacer.
                                        <ul className="list-disc list-inside mt-2 font-medium text-foreground">
                                           {req.items.map(item => (
                                                <li key={item.materialId}>{item.quantity} x {materialMap.get(item.materialId)?.name}</li>
                                           ))}
                                        </ul>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Sí, confirmar"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                           </AlertDialogContent>
                       </AlertDialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <p>No hay devoluciones pendientes de confirmación.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
