
"use client";

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Inbox, PackagePlus, ShoppingCart, Truck, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseRequest, PurchaseOrder as PurchaseOrderType, Supplier } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generatePurchaseOrderPDF } from '@/lib/pdf-generator';
import { Timestamp } from 'firebase/firestore';

interface BatchedLot {
  lotId: string;
  category: string;
  requests: PurchaseRequest[];
}

interface GenerateOrderCardProps {
    lot: BatchedLot;
}

const GenerateOrderCard: React.FC<GenerateOrderCardProps> = ({ lot }) => {
    const { suppliers, generatePurchaseOrder } = useAppState();
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const { toast } = useToast();

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => s.categories.includes(lot.category));
    }, [suppliers, lot.category]);

    const handleGenerateOrder = async () => {
        if (!selectedSupplier) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un proveedor.' });
            return;
        }
        if (lot.requests.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Este lote no tiene solicitudes para generar una orden.' });
            return;
        }
        try {
            await generatePurchaseOrder(lot.requests, selectedSupplier);
            toast({ title: 'Orden de Compra Generada', description: `La orden para ${lot.category} ha sido creada.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo generar la orden.' });
        }
    };
    
    const totalRequests = lot.requests.length;
    const totalQuantity = lot.requests.reduce((acc, curr) => acc + curr.quantity, 0)

    return (
        <Card className="bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <PackagePlus className="h-5 w-5 text-primary"/>
                    Lote: {lot.category}
                </CardTitle>
                <CardDescription>
                    {totalRequests} solicitudes, {totalQuantity.toLocaleString()} unidades en total.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Select onValueChange={setSelectedSupplier} value={selectedSupplier}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                            ) : (
                                <div className="text-center text-sm text-muted-foreground p-4">No hay proveedores sugeridos para esta categoría.</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <Button className="w-full" onClick={handleGenerateOrder} disabled={!selectedSupplier || totalRequests === 0}>
                    <FileText className="mr-2"/> Generar Orden de Compra
                </Button>
            </CardContent>
        </Card>
    );
};

export default function OperationsOrdersPage() {
    const { purchaseRequests, purchaseOrders, suppliers } = useAppState();
    
    const batchedLots = useMemo((): BatchedLot[] => {
        const lotsMap = new Map<string, { requests: PurchaseRequest[], category: string }>();

        for (const req of purchaseRequests) {
            if (req.lotId) {
                 if (!lotsMap.has(req.lotId)) {
                    lotsMap.set(req.lotId, { requests: [], category: req.category });
                }
                lotsMap.get(req.lotId)!.requests.push(req);
            }
        }
        return Array.from(lotsMap.entries()).map(([lotId, {requests, category}]) => ({ lotId, requests, category }));
    }, [purchaseRequests]);

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Desconocido';
    const getSupplier = (id: string): Supplier | undefined => suppliers.find(s => s.id === id);
    
    const handleDownloadPDF = (order: PurchaseOrderType) => {
        const supplier = getSupplier(order.supplierId);
        if(supplier) {
            generatePurchaseOrderPDF(order, supplier);
        }
    };
    
    const getDate = (date: Date | Timestamp) => {
        return date instanceof Timestamp ? date.toDate() : date;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Órdenes de Compra"
                description="Genera, visualiza y gestiona las órdenes de compra para los proveedores."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingCart /> Lotes Listos para Orden de Compra</CardTitle>
                    <CardDescription>Estos son los lotes que has confirmado y ajustado. Ahora, asígnales un proveedor y genera la orden de compra.</CardDescription>
                </CardHeader>
                <CardContent>
                    {batchedLots.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batchedLots.map(lot => <GenerateOrderCard key={lot.lotId} lot={lot} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                            <Inbox className="h-16 w-16 mb-4"/>
                            <h3 className="text-xl font-semibold">Todo al día</h3>
                            <p className="mt-2">No hay lotes esperando para generar una orden de compra.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Truck /> Historial de Órdenes de Compra</CardTitle>
                    <CardDescription>Aquí puedes ver todas las órdenes de compra que has generado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {purchaseOrders.length > 0 ? purchaseOrders.map(order => (
                            <AccordionItem value={order.id} key={order.id} className="border rounded-lg bg-card">
                                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-4">
                                    <AccordionTrigger className="w-full p-0 hover:no-underline text-left flex-grow">
                                        <div>
                                            <h3 className="font-semibold text-base">{order.id}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Proveedor: <span className="font-medium text-primary">{getSupplierName(order.supplierId)}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Generada el: {getDate(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </AccordionTrigger>
                                    <Button 
                                        className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0" 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order); }}>
                                        <Download className="mr-2 h-4 w-4"/> Descargar PDF
                                    </Button>
                                </div>
                                <AccordionContent className="p-6 pt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Unidad</TableHead>
                                                <TableHead className="text-right">Cantidad Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items.map(item => (
                                                <TableRow key={item.materialName}>
                                                    <TableCell className="font-medium">{item.materialName}</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell className="text-right font-mono">{item.totalQuantity.toLocaleString()} </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        )) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">Sin Órdenes</h3>
                                <p className="mt-2">Aún no se han generado órdenes de compra.</p>
                            </div>
                        )}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
