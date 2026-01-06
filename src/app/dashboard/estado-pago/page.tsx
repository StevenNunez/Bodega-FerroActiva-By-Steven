
"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, DollarSign, PlusCircle, TrendingUp, ArrowRight, History, FileText, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/modules/core/hooks/use-toast';
import { generateEstadoDePagoPDF } from '@/lib/ep-pdf-generator';
import type { WorkItem } from '@/modules/core/lib/data';

export default function PaymentStatusDashboard() {
    const { workItems, addPaymentState } = useAppState();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    // Memoiza la lista de contratos con sus KPIs calculados
    const myContracts = useMemo(() => {
        if (!workItems || !user) return [];

        const contractorProjects = workItems.filter(item => item.type === 'project' && (item.assignedTo === user.id || item.createdBy === user.id));

        return contractorProjects.map(project => {
            const children = workItems.filter(item => item.parentId === project.id);
            const totalValue = children.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
            const earnedValue = children.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0) * ((item.progress || 0) / 100)), 0);
            const overallProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0;
            
            return {
                ...project,
                totalValue,
                earnedValue,
                overallProgress,
                childCount: children.length,
            };
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [workItems, user]);
    
    // Memoiza el cálculo de las estadísticas globales
    const globalStats = useMemo(() => {
        const totalValue = myContracts.reduce((acc, contract) => acc + contract.totalValue, 0);
        const earnedValue = myContracts.reduce((acc, contract) => acc + contract.earnedValue, 0);
        const overallProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0;
        
        return { totalValue, earnedValue, overallProgress };
    }, [myContracts]);


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
    };

    const handleGeneratePaymentState = async () => {
        if (!user || myContracts.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay partidas para generar un estado de pago.' });
            return;
        }
        setIsGenerating(true);
        try {
            const allItems = myContracts.flatMap(c => workItems.filter(item => item.parentId === c.id));
            const { totalValue, earnedValue } = globalStats;
            const newEpId = await addPaymentState({ totalValue, earnedValue, items: allItems });
            toast({ title: 'Estado de Pago Generado', description: 'Tu estado de pago ha sido enviado para aprobación.' });

            // Generar PDF
            await generateEstadoDePagoPDF(newEpId, user.name, totalValue, earnedValue, allItems);

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
                <StatCard title="Total Contratos Activos" value={myContracts.length} icon={Briefcase} />
                <StatCard title="Valor Total Contratado" value={formatCurrency(globalStats.totalValue)} icon={DollarSign} />
                <StatCard title="Total Ganado (a la fecha)" value={formatCurrency(globalStats.earnedValue)} icon={TrendingUp} color="text-green-500" />
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Progreso General Consolidado</CardTitle>
                    <CardDescription>Este es el porcentaje de avance ponderado de todos tus contratos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={globalStats.overallProgress} className="h-4" />
                    <p className="text-right mt-2 text-xl font-bold text-primary">{globalStats.overallProgress.toFixed(2)}%</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Columna Izquierda: Acciones Principales */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Acciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <Button className="w-full" onClick={() => router.push('/dashboard/estado-pago/contratos')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Contrato
                             </Button>
                             <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/estado-pago/historial')}>
                                <History className="mr-2 h-4 w-4" /> Ver Historial de Pagos
                             </Button>
                        </CardContent>
                    </Card>
                     <Card className="border-primary/40 border-2">
                        <CardHeader>
                            <CardTitle>Generar Nuevo Estado de Pago</CardTitle>
                            <CardDescription>Crea un registro con el avance actual para su aprobación y facturación.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleGeneratePaymentState} disabled={isGenerating || myContracts.length === 0}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2"/>}
                                Generar y Descargar EP
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Columna Derecha: Lista de Contratos */}
                <div className="lg:col-span-2 space-y-4">
                     <h2 className="text-xl font-semibold">Mis Contratos</h2>
                     {myContracts.length > 0 ? (
                        myContracts.map(contract => (
                            <Card key={contract.id} className="transition-all hover:border-primary/50 hover:shadow-md">
                                <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-muted-foreground"/>
                                            {contract.name}
                                        </CardTitle>
                                        <CardDescription>{contract.childCount} partidas asociadas</CardDescription>
                                    </div>
                                    <Button size="sm" onClick={() => router.push(`/dashboard/estado-pago/contratos/${contract.id}`)}>
                                        Gestionar <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Button>
                                </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                                        <span>Progreso Ponderado</span>
                                        <span>Valor Ganado / Total</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-lg font-bold text-primary">{contract.overallProgress.toFixed(1)}%</div>
                                        <div className="text-sm font-mono">{formatCurrency(contract.earnedValue)} / {formatCurrency(contract.totalValue)}</div>
                                    </div>
                                    <Progress value={contract.overallProgress} className="mt-2 h-2" />
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                            <p>No tienes contratos asignados.</p>
                            <p className="text-sm">Usa el formulario de "Crear Contrato" para empezar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
