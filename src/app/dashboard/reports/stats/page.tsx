
"use client";

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User, PackageSearch } from 'lucide-react';
import { MaterialRequest, Material, User as UserType } from '@/lib/data';
import { Label } from '@/components/ui/label';
import { Timestamp } from 'firebase/firestore';

type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
};

type DeliveryItem = {
    requestId: string;
    materialId: string;
    materialName: string;
    quantity: number;
    supervisorId: string;
    supervisorName: string;
    area: string;
    approvedAt: Date;
};

const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('es-CL');
}


export default function StatsPage() {
    const { requests, materials, users, loading } = useAppState();
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    const materialMap = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const flatDeliveries = useMemo((): DeliveryItem[] => {
        return (requests as CompatibleMaterialRequest[]).filter(req => req.status === 'approved').flatMap(req => {
            const supervisor = userMap.get(req.supervisorId);
            if (!supervisor) return [];

            const itemsToProcess = Array.isArray(req.items) 
                ? req.items 
                : (req.materialId && req.quantity ? [{ materialId: req.materialId, quantity: req.quantity }] : []);

            return itemsToProcess.map(item => {
                const material = materialMap.get(item.materialId);
                const approvedAt = req.createdAt instanceof Timestamp ? req.createdAt.toDate() : new Date(req.createdAt as any);
                return {
                    requestId: req.id,
                    materialId: item.materialId,
                    materialName: material?.name || 'Desconocido',
                    quantity: item.quantity,
                    supervisorId: req.supervisorId,
                    supervisorName: supervisor.name,
                    area: req.area,
                    approvedAt: approvedAt,
                };
            });
        }).sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
    }, [requests, userMap, materialMap]);


    const generalStats = useMemo(() => {
        const supervisorUsage: { [key: string]: { count: number; totalQuantity: number } } = {};

        flatDeliveries.forEach(delivery => {
            if (!supervisorUsage[delivery.supervisorId]) {
                supervisorUsage[delivery.supervisorId] = { count: 0, totalQuantity: 0 };
            }
            supervisorUsage[delivery.supervisorId].count++;
            supervisorUsage[delivery.supervisorId].totalQuantity += delivery.quantity;
        });

        const topSupervisors = Object.entries(supervisorUsage)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([supervisorId, data]) => ({
                supervisorId: supervisorId,
                name: userMap.get(supervisorId)?.name || 'Desconocido',
                ...data
            }));

        return { topSupervisors };
    }, [flatDeliveries, userMap]);


    const materialConsumptionByArea = useMemo(() => {
        if (!selectedMaterialId) return [];

        const consumptionMap = new Map<string, number>();

        flatDeliveries
            .filter(d => d.materialId === selectedMaterialId)
            .forEach(delivery => {
                const currentQuantity = consumptionMap.get(delivery.area) || 0;
                consumptionMap.set(delivery.area, currentQuantity + delivery.quantity);
            });
        
        return Array.from(consumptionMap.entries())
            .map(([area, totalQuantity]) => ({ area, totalQuantity }))
            .sort((a, b) => b.totalQuantity - a.totalQuantity);

    }, [selectedMaterialId, flatDeliveries]);


    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Estadísticas de Consumo" description="Analiza el consumo de materiales, las entregas por persona y el comportamiento de las solicitudes."/>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User/> Top Solicitantes</CardTitle>
                            <CardDescription>Usuarios que han realizado más solicitudes aprobadas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supervisor</TableHead>
                                        <TableHead className="text-right">Nº Solicitudes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {generalStats.topSupervisors.map(sup => (
                                        <TableRow key={sup.supervisorId}>
                                            <TableCell className="font-medium">{sup.name}</TableCell>
                                            <TableCell className="text-right font-mono">{sup.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Entregas de Material por Destino</CardTitle>
                            <CardDescription>Selecciona un material para ver un resumen de cuánto se ha entregado a cada área o trabajador.</CardDescription>
                            <div className="pt-4">
                                <Label htmlFor="material-select">Seleccionar Material</Label>
                                <Select onValueChange={setSelectedMaterialId}>
                                    <SelectTrigger id="material-select" className="w-full">
                                        <SelectValue placeholder="Busca y selecciona un material..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {materials.map(mat => (
                                            <SelectItem key={mat.id} value={mat.id}>
                                                {mat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96 border rounded-md">
                                {selectedMaterialId ? (
                                    materialConsumptionByArea.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Área / Trabajador</TableHead>
                                                    <TableHead className="text-right">Cantidad Total Entregada</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {materialConsumptionByArea.map(({ area, totalQuantity }) => (
                                                    <TableRow key={area}>
                                                        <TableCell className="font-medium">{area}</TableCell>
                                                        <TableCell className="text-right font-mono">{totalQuantity.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                            <PackageSearch className="h-12 w-12 mb-4"/>
                                            <p>No se encontraron entregas para este material.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                        <p>Selecciona un material para ver las estadísticas.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
