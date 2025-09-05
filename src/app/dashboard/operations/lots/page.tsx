
"use client";

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, PackagePlus, Inbox, PackageMinus, PlusCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseRequest } from '@/lib/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type IntelligentLot = {
    lotId: string;
    category: string;
    requests: PurchaseRequest[];
    totalQuantity: number;
}

export default function OperationsLotsPage() {
    const { purchaseRequests, batchApprovedRequests, removeRequestFromLot, addRequestToLot } = useAppState();
    const { toast } = useToast();

    const approvedRequests = useMemo(() => 
        purchaseRequests.filter(pr => pr.status === 'approved' && !pr.lotId), 
    [purchaseRequests]);
    
    const batchedLots = useMemo((): IntelligentLot[] => {
        const batchedRequests = purchaseRequests.filter(pr => !!pr.lotId);
        const lotsMap = new Map<string, { requests: PurchaseRequest[], totalQuantity: number, category: string }>();
        
        for (const req of batchedRequests) {
             if (!req.lotId) continue;
            if (!lotsMap.has(req.lotId)) {
                // Find the first request that defined this lot to determine the category
                const definingRequest = batchedRequests.find(r => r.lotId === req.lotId);
                lotsMap.set(req.lotId, { requests: [], totalQuantity: 0, category: definingRequest?.category || 'Mixto' });
            }
            const lot = lotsMap.get(req.lotId)!;
            lot.requests.push(req);
            lot.totalQuantity += req.quantity;
        }

        return Array.from(lotsMap.entries()).map(([lotId, data]) => ({
            lotId,
            ...data,
        })).sort((a,b) => a.category.localeCompare(b.category));
    }, [purchaseRequests])

    const handleConfirmBatch = async () => {
        const requestIds = approvedRequests.map(r => r.id);
        if (requestIds.length === 0) return;
        try {
            await batchApprovedRequests(requestIds);
            toast({ title: 'Lotes Confirmados', description: `Las solicitudes aprobadas han sido agrupadas.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }
    
    const handleRemove = async (requestId: string) => {
        try {
            await removeRequestFromLot(requestId);
            toast({ title: 'Solicitud Movida', description: 'La solicitud ha vuelto a la lista de aprobadas.'});
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }

    const handleAddBack = async (requestId: string, lotId: string) => {
        if (!lotId) return;
        try {
            await addRequestToLot(requestId, lotId);
            toast({ title: 'Solicitud Re-agrupada', description: 'La solicitud ha vuelto al lote.'});
        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }


    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Lotes de Compra"
                description="Agrupa las solicitudes aprobadas en lotes y ajústalos antes de generar las órdenes de compra."
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Solicitudes Aprobadas (Sin Lote)</CardTitle>
                        <CardDescription>Aquí están todas las solicitudes aprobadas que esperan ser agrupadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {approvedRequests.length > 0 ? (
                           <ScrollArea className="h-[60vh]">
                             <div className="space-y-3 pr-4">
                                {approvedRequests.map(req => (
                                    <div key={req.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                                        <div className='flex-grow'>
                                            <p className="font-semibold text-sm">{req.materialName} ({req.quantity} {req.unit})</p>
                                            <p className="text-xs text-muted-foreground">{req.category} / Para: {req.area}</p>
                                        </div>
                                        <div className="w-48">
                                            <Select onValueChange={(lotId) => handleAddBack(req.id, lotId)} disabled={batchedLots.length === 0}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Asignar a Lote..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {batchedLots.map(lot => (
                                                        <SelectItem key={lot.lotId} value={lot.lotId}>Lote: {lot.category}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                             </div>
                           </ScrollArea>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">No hay solicitudes para agrupar</h3>
                                <p className="mt-2">Cuando se aprueben nuevas solicitudes, aparecerán aquí.</p>
                            </div>
                        )}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full mt-4" disabled={approvedRequests.length === 0}>
                                    <PackagePlus className="mr-2"/> Crear Lotes Inteligentes
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Crear Lotes Inteligentes?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta acción agrupará todas las solicitudes aprobadas por categoría en lotes. Podrás modificar los lotes después de crearlos.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmBatch}>Sí, Crear Lotes</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Check/> Lotes de Compra Activos</CardTitle>
                        <CardDescription>Estos lotes están listos. Ve a "Órdenes de Compra" para generar los documentos para el proveedor, o ajústalos aquí.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-[65vh]">
                        {batchedLots.length > 0 ? batchedLots.map(lot => (
                           <div key={lot.lotId} className="p-4 border rounded-lg bg-muted/30 mb-4">
                                <h3 className="font-semibold text-lg text-primary">{lot.category}</h3>
                                <p className="text-sm text-muted-foreground mb-3">{lot.requests.length} solicitudes, {lot.totalQuantity} unidades en total.</p>
                                <div className="space-y-2">
                                    {lot.requests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between bg-card p-2 rounded-md">
                                             <div>
                                                <p className="font-medium text-sm">{req.materialName} ({req.quantity} {req.unit})</p>
                                                <p className="text-xs text-muted-foreground">Para: {req.area}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(req.id)}>
                                                <PackageMinus className="mr-2 h-4 w-4"/> Quitar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                           <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">No hay lotes activos</h3>
                                <p className="mt-2">Crea lotes inteligentes desde las solicitudes aprobadas.</p>
                            </div>
                        )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
