"use client";

import React, { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Clock, CheckCircle, CircleDollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentState } from '@/modules/core/lib/data';
import { Timestamp } from 'firebase/firestore';
import { generateEstadoDePagoPDF } from '@/lib/ep-pdf-generator';

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const getStatusBadge = (status: PaymentState['status']) => {
    switch (status) {
        case 'pending':
            return <Badge className="bg-yellow-500 text-white"><Clock className="mr-2 h-3 w-3" />Pendiente</Badge>;
        case 'approved':
            return <Badge className="bg-green-600 text-white"><CheckCircle className="mr-2 h-3 w-3" />Aprobado</Badge>;
        case 'paid':
            return <Badge className="bg-blue-600 text-white"><CircleDollarSign className="mr-2 h-3 w-3" />Pagado</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

export default function PaymentHistoryPage() {
    const { paymentStates, users } = useAppState();
    const { user } = useAuth();

    const myPaymentStates = useMemo(() => {
        if (!user || !paymentStates) return [];
        return paymentStates
            .filter(ps => ps.contractorId === user.id)
            .sort((a, b) => {
                const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
    }, [paymentStates, user]);
    
    const handleDownload = async (ep: PaymentState) => {
        if (!user) return;
        await generateEstadoDePagoPDF(ep.id, user.name, ep.totalValue, ep.earnedValue, ep.items);
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Historial de Estados de Pago"
                description="Aquí puedes ver y descargar todos los estados de pago que has generado."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Mis Estados de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Valor Total Contrato</TableHead>
                                    <TableHead>Valor Ganado</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myPaymentStates.length > 0 ? myPaymentStates.map(ep => (
                                    <TableRow key={ep.id}>
                                        <TableCell>{formatDate(ep.createdAt)}</TableCell>
                                        <TableCell>{formatCurrency(ep.totalValue)}</TableCell>
                                        <TableCell className="font-semibold text-primary">{formatCurrency(ep.earnedValue)}</TableCell>
                                        <TableCell>{getStatusBadge(ep.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleDownload(ep)}>
                                                <Download className="mr-2 h-4 w-4"/> PDF
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            No has generado ningún estado de pago.
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
