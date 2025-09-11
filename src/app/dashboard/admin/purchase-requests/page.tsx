
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PurchaseRequest, PurchaseRequestStatus } from "@/lib/data";
import { Check, Clock, X, PackageCheck, Loader2, Box, FileText } from "lucide-react";
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";

export default function AdminPurchaseRequestsPage() {
  const { purchaseRequests, users, receivePurchaseRequest } = useAppState();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleReceive = async (id: string) => {
    setUpdatingId(id);
    try {
        await receivePurchaseRequest(id);
        toast({title: "Stock Actualizado", description: "El material ha sido ingresado al inventario."});
    } catch (error: any) {
        toast({variant: "destructive", title: "Error", description: error?.message || "No se pudo actualizar el stock."});
    } finally {
        setUpdatingId(null);
    }
  }

  const getStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Rechazado</Badge>;
      case 'received':
        return <Badge variant="default" className="bg-blue-600 text-white"><PackageCheck className="mr-1 h-3 w-3" />Recibido</Badge>;
      case 'batched':
        return <Badge variant="default" className="bg-purple-600 text-white"><Box className="mr-1 h-3 w-3" />En Lote</Badge>;
      case 'ordered':
        return <Badge variant="default" className="bg-cyan-600 text-white"><FileText className="mr-1 h-3 w-3" />Orden Generada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };
  
  const getActionContent = (req: PurchaseRequest) => {
      if (req.justification === 'Ingreso Manual de Stock Inicial') {
          return <span className="text-xs text-blue-500">Ingreso Manual</span>;
      }
      if (req.status === 'ordered') {
          return (
              <Button size="sm" onClick={() => handleReceive(req.id)} disabled={updatingId === req.id}>
                  {updatingId === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackageCheck className="mr-2 h-4 w-4"/>}
                  Recibir
              </Button>
          )
      }
      switch(req.status) {
          case 'received':
              return <span className="text-xs text-green-500">Ingresado</span>;
          case 'pending':
              return <span className="text-xs text-muted-foreground">Pendiente de Aprobación</span>;
          case 'rejected':
              return <span className="text-xs text-red-500">Rechazada</span>;
           case 'ordered':
               return <span className="text-xs text-cyan-500">Orden Generada</span>;
          case 'batched':
               return <span className="text-xs text-purple-500">Agrupada en lote</span>;
          case 'approved':
               return <span className="text-xs text-green-500">Aprobada, esperando lote</span>;
          default:
               return <span className="text-xs text-muted-foreground">No requiere acción</span>;
      }
  }

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
      if (!date) return null;
      return date instanceof Timestamp ? date.toDate() : date;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Visualización de Solicitudes de Compra"
        description="Aquí puedes ver el estado de todas las solicitudes y gestionar el ingreso de materiales aprobados."
      />

      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes de Compra</CardTitle>
          <CardDescription>
            El Jefe de Operaciones aprueba y gestiona las compras. Tú te encargas de registrar su ingreso a la bodega. También se muestran los ingresos manuales de stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table className="min-w-[700px] whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Fecha Solicitud</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRequests.length > 0 ? (
                  purchaseRequests.map((req) => {
                    const supervisor = users.find((u) => u.id === req.supervisorId);
                    const createdAtDate = getDate(req.createdAt);
                    const receivedAtDate = getDate(req.receivedAt);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.materialName}</TableCell>
                        <TableCell>{req.quantity}</TableCell>
                        <TableCell>{supervisor?.name || "N/A"}</TableCell>
                        <TableCell>{createdAtDate ? createdAtDate.toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                         <TableCell>
                          {receivedAtDate ? receivedAtDate.toLocaleDateString() : '---'}
                        </TableCell>
                        <TableCell className="text-right">
                          {getActionContent(req)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No hay solicitudes de compra todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
