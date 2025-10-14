"use client";

import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useMemo } from "react";
import { Package, ShoppingCart, PackageSearch } from "lucide-react";
import type { MaterialRequest, PurchaseRequest as PurchaseRequestType, PurchaseRequestStatus } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timestamp } from "firebase/firestore";
import { Clock, Check, X, Box, FileText, PackageCheck } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
};


export default function AprPage() {
  const { materials, requests, purchaseRequests } = useAppState();
  const { user: authUser } = useAuth();
  
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  // Requests made by the current user
  const myMaterialRequests = useMemo(() => (requests as CompatibleMaterialRequest[]).filter(r => r.supervisorId === authUser?.id).slice(0, 5), [requests, authUser]);
  const myPurchaseRequests = useMemo(() => purchaseRequests.filter(pr => pr.supervisorId === authUser?.id).slice(0, 5), [purchaseRequests, authUser]);
  

  const getMaterialStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
    }
  };

  const getPurchaseStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      case 'approved': return <Badge variant="default" className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" />Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive"><X className="mr-1 h-3 w-3"/>Rechazado</Badge>;
      case "received": return <Badge variant="default" className="bg-blue-600 text-white"><PackageCheck className="mr-1 h-3 w-3" />Recibido</Badge>;
      case "batched": return <Badge variant="default" className="bg-purple-600 text-white"><Box className="mr-1 h-3 w-3" />En Lote</Badge>;
      case "ordered": return <Badge variant="default" className="bg-cyan-600 text-white"><FileText className="mr-1 h-3 w-3" />Orden Generada</Badge>;
    }
  };

  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('es-CL');
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Panel de APR`} description="Gestiona los checklists, el inventario y las solicitudes desde tu panel." />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-3 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Mis Solicitudes</CardTitle>
                    <CardDescription>Resumen de tus últimas 5 solicitudes de bodega y de compra.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="bodega">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="bodega">Solicitudes de Bodega</TabsTrigger>
                            <TabsTrigger value="compra">Solicitudes de Compra</TabsTrigger>
                        </TabsList>
                        <TabsContent value="bodega">
                             <ScrollArea className="h-60 mt-4 border rounded-md">
                                {myMaterialRequests.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Ítems</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {myMaterialRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        <ul className="list-disc list-inside text-xs">
                                                            {(req.items || []).map(item => (
                                                                <li key={item.materialId} className="truncate">
                                                                    {item.quantity}x {materialMap.get(item.materialId)?.name || "N/A"}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                                                    </TableCell>
                                                    <TableCell>{getMaterialStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                        <PackageSearch className="h-10 w-10 mb-2"/>
                                        <p>No tienes solicitudes de bodega recientes.</p>
                                    </div>
                                )}
                                <ScrollBar orientation="vertical" />
                             </ScrollArea>
                        </TabsContent>
                        <TabsContent value="compra">
                              <ScrollArea className="h-60 mt-4 border rounded-md">
                                {myPurchaseRequests.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {myPurchaseRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        <p className="font-medium text-xs truncate">{req.quantity}x {req.materialName}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                                                    </TableCell>
                                                    <TableCell>{getPurchaseStatusBadge(req.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                        <ShoppingCart className="h-10 w-10 mb-2"/>
                                        <p>No tienes solicitudes de compra recientes.</p>
                                    </div>
                                )}
                                <ScrollBar orientation="vertical" />
                             </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
