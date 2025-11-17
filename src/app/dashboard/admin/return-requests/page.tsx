"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, X, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/modules/core/hooks/use-toast";
import type { ReturnRequest } from "@/modules/core/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type Status = "pending" | "completed" | "rejected";

export default function AdminReturnRequestsPage() {
  const { returnRequests, updateReturnRequestStatus, isLoading } = useAppState();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = getDate(date);
    return jsDate ? jsDate.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A";
  };
  
  const handleStatusUpdate = async (requestId: string, status: 'completed' | 'rejected') => {
      try {
          await updateReturnRequestStatus(requestId, status);
          toast({
              title: status === 'completed' ? 'Devolución Aceptada' : 'Devolución Rechazada',
              description: 'El estado de la solicitud ha sido actualizado.'
          });
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Error',
              description: error.message || 'No se pudo actualizar la solicitud.'
          });
      }
  }

  const filteredRequests = useMemo(() => {
    return (returnRequests || [])
      .filter((req: ReturnRequest) => req.status === activeTab)
      .sort((a: ReturnRequest, b: ReturnRequest) => {
        const dateA = a.createdAt ? getDate(a.createdAt)?.getTime() || 0 : 0;
        const dateB = b.createdAt ? getDate(b.createdAt)?.getTime() || 0 : 0;
        return dateB - dateA;
      });
  }, [returnRequests, activeTab]);
  
  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" /> Pendiente</Badge>;
      case "completed":
        return <Badge className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" /> Completada</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" /> Rechazada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestionar Devoluciones de Material"
        description="Aprueba o rechaza las devoluciones de material sobrante que los supervisores han registrado."
      />
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Devolución</CardTitle>
          <CardDescription>Navega entre las pestañas para ver las solicitudes por estado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Status)}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[calc(80vh-16rem)] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Estado</TableHead>
                      {activeTab === 'pending' && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={activeTab === 'pending' ? 7 : 6} className="h-24 text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : filteredRequests.length > 0 ? (
                      filteredRequests.map((req: ReturnRequest) => (
                        <TableRow key={req.id}>
                          <TableCell>{formatDate(req.createdAt)}</TableCell>
                          <TableCell>{req.supervisorName}</TableCell>
                          <TableCell className="font-medium">{req.materialName}</TableCell>
                          <TableCell>{req.quantity} {req.unit}</TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{req.notes || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          {activeTab === 'pending' && (
                            <TableCell className="text-right space-x-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                            <X className="mr-2 h-4 w-4" /> Rechazar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar Rechazo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción marcará la solicitud como rechazada y el stock no se modificará.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleStatusUpdate(req.id, 'rejected')} className="bg-destructive hover:bg-destructive/90">
                                            Sí, Rechazar
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            <Check className="mr-2 h-4 w-4" /> Aprobar Ingreso
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar Devolución?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Al confirmar, se añadirán <strong>{req.quantity} {req.unit} de {req.materialName}</strong> de vuelta al inventario.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleStatusUpdate(req.id, 'completed')} className="bg-green-600 hover:bg-green-700">
                                            Sí, Confirmar Ingreso
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'pending' ? 7 : 6} className="h-24 text-center">
                          No hay solicitudes en esta categoría.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
