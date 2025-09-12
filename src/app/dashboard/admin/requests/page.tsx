
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timestamp } from "firebase/firestore";

export default function AdminRequestsPage() {
  const { requests, materials, users, approveRequest } = useAppState();
  const { toast } = useToast();

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest(requestId);
      toast({ title: "Solicitud Aprobada", description: "El stock ha sido actualizado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al aprobar", description: error?.message || "No se pudo completar la acción." });
    }
  };

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getDate = (date: Date | Timestamp) => {
      return date instanceof Timestamp ? date.toDate() : date;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Solicitudes de Materiales"
        description="Revisa y aprueba las solicitudes de materiales existentes en la bodega."
      />

      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes de materiales</CardTitle>
          <CardDescription>
            Aquí se listan todas las solicitudes de materiales del inventario, tanto las pendientes como las ya gestionadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="whitespace-nowrap">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Área/Proyecto</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length > 0 ? (
                    requests.map((req) => {
                      const material = materials.find((m) => m.id === req.materialId);
                      const supervisor = users.find((u) => u.id === req.supervisorId);
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{material?.name || "N/A"}</TableCell>
                          <TableCell>{req.quantity}</TableCell>
                          <TableCell>{req.area}</TableCell>
                          <TableCell>{supervisor?.name || "N/A"}</TableCell>
                          <TableCell>{getDate(req.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                            {req.status === "pending" && (
                              <Button size="sm" onClick={() => handleApprove(req.id)}>
                                Aprobar
                              </Button>
                            )}
                            {req.status !== "pending" && (
                              <span className="text-xs text-muted-foreground">Gestionada</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No hay solicitudes de stock todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
