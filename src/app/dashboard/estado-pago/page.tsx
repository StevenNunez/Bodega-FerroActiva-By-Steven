"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, DollarSign, PlusCircle, TrendingUp, ArrowRight, History, FileText, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/modules/core/hooks/use-toast';
import { generateEstadoDePagoPDF } from '@/lib/ep-pdf-generator';

export default function PaymentStatusDashboard() {
    const { workItems, can, addPaymentState } = useAppState();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const contractorStats = useMemo(() => {
        if (!user || !workItems) return { totalValue: 0, earnedValue: 0, itemCount: 0, overallProgress: 0, myItems: [] };

        const myItems = workItems.filter(item => item.assignedTo === user.id);
        
        const totalValue = myItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const earnedValue = myItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * ((item.progress || 0) / 100)), 0);
        const itemCount = myItems.length;
        
        const overallProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0;

        return { totalValue, earnedValue, itemCount, overallProgress, myItems };
    }, [workItems, user]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    const handleGeneratePaymentState = async () => {
        if (!user || contractorStats.myItems.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay partidas para generar un estado de pago.' });
            return;
        }
        setIsGenerating(true);
        try {
            const { totalValue, earnedValue, myItems } = contractorStats;
            const newEpId = await addPaymentState({ totalValue, earnedValue, items: myItems });
            toast({ title: 'Estado de Pago Generado', description: 'Tu estado de pago ha sido enviado para aprobación.' });

            // Generar PDF
            if (user && myItems.length > 0) {
                await generateEstadoDePagoPDF(newEpId, user.name, totalValue, earnedValue, myItems);
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo generar el estado de pago.' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="Resumen de Estado de Pago" description="Vista general del valor de tus contratos, el avance y las ganancias." />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Partidas" value={contractorStats.itemCount} icon={Briefcase} />
                <StatCard title="Valor Total Contratado" value={formatCurrency(contractorStats.totalValue)} icon={DollarSign} />
                <StatCard title="Total Ganado (a la fecha)" value={formatCurrency(contractorStats.earnedValue)} icon={TrendingUp} color="text-green-500" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Progreso General</CardTitle>
                    <CardDescription>Este es el porcentaje de avance general ponderado por el valor de cada partida.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={contractorStats.overallProgress} className="h-4" />
                    <p className="text-right mt-2 text-xl font-bold text-primary">{contractorStats.overallProgress.toFixed(2)}%</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/dashboard/estado-pago/contratos" className="group block">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md hover:-translate-y-1">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    <Briefcase className="h-6 w-6 text-primary" />
                                    Gestionar Partidas y Avance
                                </CardTitle>
                                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </div>
                            <CardDescription className="pt-2">Añade o edita tus partidas y registra el avance diario.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                 <Link href="/dashboard/estado-pago/historial" className="group block">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md hover:-translate-y-1">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    <History className="h-6 w-6 text-primary" />
                                    Historial de Pagos
                                </CardTitle>
                                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </div>
                            <CardDescription className="pt-2">Consulta todos los estados de pago que has generado.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
            
            <Card className="border-primary/40 border-2">
                <CardHeader>
                    <CardTitle>Generar Nuevo Estado de Pago</CardTitle>
                    <CardDescription>Al generar un estado de pago, se creará un registro con el avance actual para su aprobación y posterior facturación.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGeneratePaymentState} disabled={isGenerating || contractorStats.itemCount === 0}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2"/>}
                        Generar y Descargar Estado de Pago Actual
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
