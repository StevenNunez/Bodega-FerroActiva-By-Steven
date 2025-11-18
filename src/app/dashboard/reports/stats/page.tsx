
"use client";

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User, PackageSearch, ChevronsUpDown, Check, TrendingUp } from 'lucide-react';
import { MaterialRequest, Material, User as UserType } from '@/modules/core/lib/data';
import { Label } from '@/components/ui/label';
import { Timestamp } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
    items?: { materialId: string; quantity: number }[];
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
    const { requests, materials, users, isLoading } = useAppState();
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    // State for the new query card
    const [queryMaterialId, setQueryMaterialId] = useState<string | null>(null);
    const [querySupervisorId, setQuerySupervisorId] = useState<string | null>(null);
    const [queryMaterialPopover, setQueryMaterialPopover] = useState(false);
    const [querySupervisorPopover, setQuerySupervisorPopover] = useState(false);


    const materialMap = useMemo(() => new Map<string, Material>((materials || []).map((m: Material) => [m.id, m])), [materials]);
    const userMap = useMemo(() => new Map<string, UserType>((users || []).map((u: UserType) => [u.id, u])), [users]);

    const flatDeliveries = useMemo((): DeliveryItem[] => {
        if (!requests) return [];
        return (requests as CompatibleMaterialRequest[]).filter((req: CompatibleMaterialRequest) => req.status === 'approved').flatMap((req: CompatibleMaterialRequest) => {
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

    const queriedTotal = useMemo(() => {
        if (!queryMaterialId || !querySupervisorId) return null;

        return flatDeliveries
            .filter(d => d.materialId === queryMaterialId && d.supervisorId === querySupervisorId)
            .reduce((total, delivery) => total + delivery.quantity, 0);

    }, [queryMaterialId, querySupervisorId, flatDeliveries]);


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const supervisors = Array.from(userMap.values()).filter(u => u.role === 'supervisor' || u.role === 'apr' || u.role === 'operations');

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Estadísticas de Consumo" description="Analiza el consumo de materiales, las entregas por persona y el comportamiento de las solicitudes."/>
            
             <Card>
                <CardHeader>
                    <CardTitle>Consulta de Consumo por Supervisor</CardTitle>
                    <CardDescription>Selecciona un material y un supervisor para ver el total solicitado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Material</Label>
                             <Popover open={queryMaterialPopover} onOpenChange={setQueryMaterialPopover}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        <span className="truncate">{queryMaterialId ? materialMap.get(queryMaterialId)?.name : "Selecciona un material..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar material..." />
                                        <CommandList><CommandEmpty>No se encontró.</CommandEmpty><CommandGroup>
                                            {(materials || []).map((material: Material) => (
                                                <CommandItem key={material.id} value={material.name} onSelect={() => {setQueryMaterialId(material.id); setQueryMaterialPopover(false);}}>
                                                    <Check className={cn("mr-2 h-4 w-4", queryMaterialId === material.id ? "opacity-100" : "opacity-0")} />
                                                    {material.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Supervisor</Label>
                             <Popover open={querySupervisorPopover} onOpenChange={setQuerySupervisorPopover}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        <span className="truncate">{querySupervisorId ? userMap.get(querySupervisorId)?.name : "Selecciona un supervisor..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar supervisor..." />
                                        <CommandList><CommandEmpty>No se encontró.</CommandEmpty><CommandGroup>
                                            {supervisors.map((user: UserType) => (
                                                <CommandItem key={user.id} value={user.name} onSelect={() => {setQuerySupervisorId(user.id); setQuerySupervisorPopover(false);}}>
                                                    <Check className={cn("mr-2 h-4 w-4", querySupervisorId === user.id ? "opacity-100" : "opacity-0")} />
                                                    {user.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {queriedTotal !== null && (
                        <div className="pt-4 text-center">
                            <p className="text-muted-foreground">Total solicitado:</p>
                             <p className="text-4xl font-bold text-primary">{queriedTotal.toLocaleString()} <span className="text-xl font-normal">{materialMap.get(queryMaterialId!)?.unit}</span></p>
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={popoverOpen}
                                            className="w-full justify-between"
                                        >
                                            {selectedMaterialId
                                                ? (materials || []).find((m: Material) => m.id === selectedMaterialId)?.name
                                                : "Busca y selecciona un material..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar material..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró el material.</CommandEmpty>
                                                <CommandGroup>
                                                    {(materials || []).map((material: Material) => (
                                                        <CommandItem
                                                            key={material.id}
                                                            value={material.name}
                                                            onSelect={() => {
                                                                setSelectedMaterialId(material.id);
                                                                setPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedMaterialId === material.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {material.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
