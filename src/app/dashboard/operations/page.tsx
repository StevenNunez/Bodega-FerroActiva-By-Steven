
"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PurchaseRequest, PurchaseRequestStatus } from "@/lib/data";
import { Check, Clock, X, Edit, ShoppingCart, Users, Wrench, PackageCheck, AlertTriangle, TrendingUp, PackageSearch, PackageOpen, Box, FileText, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useMemo, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { EditPurchaseRequestForm } from "@/components/operations/edit-purchase-request-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function OperationsPage() {
  const { purchaseRequests, users, updatePurchaseRequestStatus, requests, tools, materials, toolLogs } = useAppState();
  const { user: authUser } = useAuth();
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);

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
  
  const pendingPurchaseRequests = purchaseRequests.filter(r => r.status === 'pending');
  const lowStockMaterials = materials.filter(m => m.stock < 100);
  const checkedOutTools = toolLogs.filter(log => log.returnDate === null);
  
  const mostUsedMaterials = useMemo(() => {
    const usage = requests
      .filter(r => r.status === 'approved')
      .reduce((acc, req) => {
        acc[req.materialId] = (acc[req.materialId] || 0) + req.quantity;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([materialId, quantity]) => {
        const material = materials.find(m => m.id === materialId);
        return {
          name: material?.name || 'Desconocido',
          quantity
        };
      });
  }, [requests, materials]);

    const getDate = (date: Date | Timestamp) => {
        return date instanceof Timestamp ? date.toDate() : date;
    }

  const recentApprovedRequests = useMemo(() => {
      return requests
        .filter(r => r.status === 'approved')
        .sort((a,b) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime())
        .slice(0, 5);
  }, [requests]);

  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
        return `Cantidad original: ${req.originalQuantity}. ${req.notes || ''}`;
    }
    if (req.notes) {
        return req.notes;
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {editingRequest && (
        <EditPurchaseRequestForm 
            request={editingRequest}
            isOpen={!!editingRequest}
            onClose={() => setEditingRequest(null)}
        />
      )}

      <PageHeader
        title={`Bienvenido, ${authUser?.name}`}
        description="Gestiona las solicitudes de compra y supervisa el estado general de la operación."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Compra Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPurchaseRequests.length}</div>
            <p className="text-xs text-muted-foreground">Esperando tu aprobación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Materiales</CardTitle>
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-xs text-muted-foreground">En inventario total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Herramientas en Uso</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedOutTools.length}</div>
            <p className="text-xs text-muted-foreground">Fuera de bodega actualmente</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Stock</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Pendientes en bodega</p>
          </CardContent>
        </Card>
      </div>

    <Card>
        <CardHeader>
        <CardTitle>Gestión de Solicitudes de Compra</CardTitle>
        <CardDescription>
            Aquí se listan todas las solicitudes de compra de materiales para su futura adquisición.
        </CardDescription>
        </CardHeader>
        <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Justificación</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchaseRequests.length > 0 ? (
                purchaseRequests.map((req) => {
                    const supervisor = users.find((u) => u.id === req.supervisorId);
                    const changeTooltip = getChangeTooltip(req);
                    return (
                    <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.materialName}</TableCell>
                        <TableCell className="flex items-center gap-2">
                            {req.quantity} {req.unit}
                            {changeTooltip && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">{changeTooltip}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{req.justification}</TableCell>
                        <TableCell>{supervisor?.name || "N/A"}</TableCell>
                        <TableCell>{getDate(req.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-right">
                        {req.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => setEditingRequest(req)}>
                                <Edit className="mr-2 h-4 w-4" /> Gestionar
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
                    No hay solicitudes de compra todavía.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </ScrollArea>
        </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-amber-500/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500"><AlertTriangle /> Materiales con Bajo Stock</CardTitle>
                <CardDescription>Materiales con menos de 100 unidades disponibles. Prioridad de compra.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-60">
                    {lowStockMaterials.length > 0 ? (
                        <ul className="space-y-3 pr-2">
                            {lowStockMaterials.map(mat => (
                                <li key={mat.id} className="flex justify-between items-center text-sm p-2 rounded-md border border-amber-500/20">
                                    <span>{mat.name}</span>
                                    <span className="font-bold text-amber-500">{mat.stock}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                            <PackageSearch className="h-10 w-10 mb-2"/>
                            <p>No hay materiales con bajo stock.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp/> Materiales Más Solicitados</CardTitle>
                <CardDescription>Top 5 materiales más pedidos de la bodega.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-60">
                {mostUsedMaterials.length > 0 ? (
                    <ul className="space-y-3">
                        {mostUsedMaterials.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                <span className="font-medium truncate pr-2">{item.name}</span>
                                <span className="font-mono text-primary font-semibold">{item.quantity.toLocaleString()} uds</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                        <PackageSearch className="h-10 w-10 mb-2"/>
                        <p>No hay datos de uso aún.</p>
                    </div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PackageOpen/> Últimas Salidas de Bodega</CardTitle>
                <CardDescription>Las 5 solicitudes de material más recientes que fueron aprobadas.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-60">
                {recentApprovedRequests.length > 0 ? (
                    <ul className="space-y-3">
                        {recentApprovedRequests.map(req => {
                            const material = materials.find(m => m.id === req.materialId);
                            const supervisor = users.find(u => u.id === req.supervisorId);
                            return (
                            <li key={req.id} className="text-sm p-2 rounded-md bg-muted/50">
                                <p className="font-semibold">{material?.name} <span className="font-normal text-primary">({req.quantity} uds)</span></p>
                                <p className="text-xs text-muted-foreground mt-1">Para: {req.area} (Solicitado por {supervisor?.name})</p>
                            </li>
                        )})}
                    </ul>
                ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                        <PackageSearch className="h-10 w-10 mb-2"/>
                        <p>No hay salidas recientes.</p>
                    </div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
    </div>

    </div>
  );
}
