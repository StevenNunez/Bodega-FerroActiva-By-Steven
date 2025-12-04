

"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Send, ArrowRight, Clock, Check, X, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import type { MaterialRequest, Material, User } from "@/modules/core/lib/data";

type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
    items?: { materialId: string; quantity: number }[];
};

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SupervisorHubPage() {
    const { requests, materials, can } = useAppState();
    const { user } = useAuth();

    const materialMap = useMemo(() => new Map((materials || []).map((m: Material) => [m.id, m])), [materials]);

    const myRequests = useMemo(() => {
        if (!user) return [];
        return ((requests || []) as CompatibleMaterialRequest[])
            .filter(r => r.supervisorId === user.id)
            .sort((a,b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [requests, user]);
    
    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        switch (status) {
            case "pending": return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="mr-1 h-3 w-3" /> Pendiente</Badge>;
            case "approved": return <Badge className="bg-green-600 text-white"><Check className="mr-1 h-3 w-3" /> Aprobado</Badge>;
            case "rejected": return <Badge variant="destructive"><X className="mr-1 h-3 w-3" /> Rechazado</Badge>;
            default: return <Badge variant="outline">Desconocido</Badge>;
        }
    };
    
    const renderRequestItems = (request: CompatibleMaterialRequest) => {
        const items = request.items || (request.materialId ? [{ materialId: request.materialId, quantity: request.quantity || 0 }] : []);
        return (
            <ul className="list-disc list-inside">
                {items.map((item, index) => {
                    const material = materialMap.get(item.materialId) as Material | undefined;
                    const materialName = material ? material.name : "N/A";
                    return (
                        <li key={index} className="text-xs truncate">
                            {item.quantity}x {materialName}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Panel de Supervisor"
                description="Gestiona tus solicitudes de materiales y herramientas para tu equipo."
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Columna de Acciones */}
                <div className="lg:col-span-1 space-y-8">
                    {can('material_requests:create') && (
                        <Link href="/dashboard/supervisor/request" className="group">
                            <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><Send /> Solicitar Material de Bodega</CardTitle>
                                        <CardDescription>Pide materiales con stock disponible.</CardDescription>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                </CardHeader>
                            </Card>
                        </Link>
                    )}
                     {can('purchase_requests:create') && (
                        <Link href="/dashboard/supervisor/purchase-request-form" className="group">
                            <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><ShoppingCart /> Solicitar Compra de Material</CardTitle>
                                        <CardDescription>Pide materiales sin stock o nuevos.</CardDescription>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                </CardHeader>
                            </Card>
                        </Link>
                    )}
                </div>

                {/* Columna de Historial */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Package/> Historial de Mis Solicitudes</CardTitle>
                            <CardDescription>Revisa el estado de todas tus solicitudes de material de bodega.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="pending">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="pending">Pendientes</TabsTrigger>
                                    <TabsTrigger value="approved">Aprobadas</TabsTrigger>
                                    <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
                                </TabsList>
                                {['pending', 'approved', 'rejected'].map(status => (
                                    <TabsContent key={status} value={status}>
                                        <ScrollArea className="h-72 border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead>Ítems</TableHead>
                                                        <TableHead>Destino</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {myRequests.filter(r => r.status === status).length > 0 ? (
                                                        myRequests.filter(r => r.status === status).map(req => (
                                                            <TableRow key={req.id}>
                                                                <TableCell>{formatDate(req.createdAt)}</TableCell>
                                                                <TableCell>{renderRequestItems(req)}</TableCell>
                                                                <TableCell>{req.area}</TableCell>
                                                                <TableCell>{getStatusBadge(req.status as 'pending' | 'approved' | 'rejected')}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="h-24 text-center">
                                                                No hay solicitudes en estado '{status}'.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
