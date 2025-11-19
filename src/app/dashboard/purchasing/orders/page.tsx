
"use client";

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Inbox, PackagePlus, ShoppingCart, Truck, Download, Trash2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/modules/core/hooks/use-toast';
import type { PurchaseOrder as PurchaseOrderType, Supplier } from '@/modules/core/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generatePurchaseOrderPDF } from '@/lib/pdf-generator';
import { Timestamp } from 'firebase/firestore';
import { useLots } from '@/hooks/use-lots';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Calendar = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), { ssr: false });


interface GenerateOrderCardProps {
    lot: ReturnType<typeof useLots>['batchedLots'][0];
}

const GenerateOrderCard: React.FC<GenerateOrderCardProps> = ({ lot }) => {
    const { suppliers, generatePurchaseOrder } = useAppState();
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const { toast } = useToast();

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
            setSelectedSupplier('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo generar la orden.' });
        }
    };
    
    const totalRequests = lot.requests.length;
    const totalQuantity = lot.requests.reduce((acc, curr) => acc + curr.quantity, 0)

    return (
        <Card className="bg-card flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base capitalize">
                            <PackagePlus className="h-5 w-5 text-primary"/>
                            {lot.category}
                        </CardTitle>
                        <CardDescription>
                            {totalRequests} solicitudes, {totalQuantity.toLocaleString()} unidades en total.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
                <div className="space-y-2">
                    <Select onValueChange={setSelectedSupplier} value={selectedSupplier}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.length > 0 ? (
                                suppliers.map((s: Supplier) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                            ) : (
                                <div className="text-center text-sm text-muted-foreground p-4">No hay proveedores registrados.</div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <Button className="w-full" onClick={handleGenerateOrder} disabled={!selectedSupplier || totalRequests === 0}>
                    <FileText className="mr-2"/>
                    <span className="sm:hidden">Generar Cotización</span>
                    <span className="hidden sm:inline">Generar Solicitud de Cotización</span>
                </Button>
            </CardContent>
        </Card>
    );
};

export default function OrdersPage() {
    const { purchaseOrders, suppliers, cancelPurchaseOrder } = useAppState();
    const { batchedLots } = useLots();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const getSupplierName = (id: string) => (suppliers || []).find((s: Supplier) => s.id === id)?.name || 'Desconocido';
    const getSupplier = (id: string): Supplier | undefined => (suppliers || []).find((s: Supplier) => s.id === id);
    
    const getDate = (date: Date | Timestamp) => {
        return date instanceof Timestamp ? date.toDate() : date;
    }
    
    const filteredPurchaseOrders = useMemo(() => {
        return (purchaseOrders || []).filter((order: PurchaseOrderType) => {
            if (!selectedDate) return true;
            const orderDate = getDate(order.createdAt);
            return isSameDay(orderDate, selectedDate);
        }).sort((a: PurchaseOrderType, b: PurchaseOrderType) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime());
    }, [purchaseOrders, selectedDate]);


    const handleDownloadPDF = (order: PurchaseOrderType, index: number) => {
        const supplier = getSupplier(order.supplierId);
        if(supplier) {
            generatePurchaseOrderPDF(order, supplier, index + 1);
        } else {
             alert("Proveedor no encontrado para esta orden.");
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        try {
            await cancelPurchaseOrder(orderId);
            toast({ title: 'Orden Anulada', description: `La orden ${orderId} fue cancelada y las solicitudes devueltas a su estado anterior.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo anular la orden.' });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Cotizaciones"
                description="Genera, visualiza y gestiona las solicitudes de cotización para los proveedores."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingCart /> Lotes Listos para Cotización</CardTitle>
                    <CardDescription>Estos son los lotes que has confirmado. Ahora, asígnales un proveedor y genera la solicitud de cotización.</CardDescription>
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
                            <p className="mt-2">No hay lotes esperando para generar una cotización.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Truck /> Historial de Cotizaciones Generadas</CardTitle>
                            <CardDescription>Aquí puedes ver todas las solicitudes de cotización que has generado.</CardDescription>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full sm:w-[280px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP", {locale: es}) : <span>Selecciona una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {filteredPurchaseOrders.length > 0 ? filteredPurchaseOrders.map((order: PurchaseOrderType, index: number) => (
                            <AccordionItem value={order.id} key={order.id} className="border rounded-lg bg-card">
                                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-4">
                                    <AccordionTrigger className="w-full p-0 hover:no-underline text-left flex-grow">
                                        <div>
                                            <h3 className="font-semibold text-base">N° {String(index + 1).padStart(3, '0')}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Proveedor: <span className="font-medium text-primary">{getSupplierName(order.supplierId)}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Generada el: {getDate(order.createdAt).toLocaleDateString('es-CL')}
                                            </p>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Anular Solicitud de Cotización?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción eliminará la solicitud y devolverá todos sus ítems a su estado anterior. ¿Estás seguro?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCancelOrder(order.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Sí, anular solicitud
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button 
                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order, index); }}>
                                            <Download className="mr-2 h-4 w-4"/> PDF
                                        </Button>
                                    </div>
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
                                            {order.items.map((item: { name: string; unit: string; totalQuantity: number; }) => (
                                                <TableRow key={item.name}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
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
                                <h3 className="text-xl font-semibold">Sin Cotizaciones</h3>
                                <p className="mt-2">No se han generado cotizaciones para la fecha seleccionada.</p>
                            </div>
                        )}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}