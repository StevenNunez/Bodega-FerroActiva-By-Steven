
"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReviewInspectionsPage() {
    const { safetyInspections, users, loading } = useAppState();
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const inspectionsToReview = useMemo(() => {
        if (!safetyInspections) return [];
        return safetyInspections
            .filter(i => i.status === 'completed' || i.status === 'approved' || i.status === 'rejected')
            .sort((a, b) => {
                const dateA = (a.completedAt || a.createdAt) as Timestamp;
                const dateB = (b.completedAt || b.createdAt) as Timestamp;
                return dateB.toMillis() - dateA.toMillis();
            });
    }, [safetyInspections]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary" className="bg-yellow-500 text-white">Listo para Revisar</Badge>;
            case 'approved': return <Badge variant="default" className="bg-green-600 text-white">Aprobado</Badge>;
            case 'rejected': return <Badge variant="destructive">Rechazado</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };
    
    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'leve': return <Badge variant="secondary">Leve</Badge>;
            case 'grave': return <Badge variant="destructive">Grave</Badge>;
            case 'fatal': return <Badge variant="destructive" className="bg-black text-white">Fatal</Badge>;
            default: return null;
        }
    }

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Revisión de Inspecciones de Seguridad"
                description="Aprueba o rechaza las soluciones implementadas por los supervisores."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Bandeja de Revisiones de Inspecciones</CardTitle>
                    <CardDescription>
                        Las inspecciones completadas por los supervisores aparecerán aquí para tu aprobación final.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                        {inspectionsToReview.length > 0 ? (
                            <div className="space-y-3 p-4">
                                {inspectionsToReview.map(inspection => (
                                    <Link key={inspection.id} href={`/dashboard/safety/review-inspections/${inspection.id}`} passHref>
                                        <div className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-primary">{inspection.description}</p>
                                                <p className="text-sm text-muted-foreground">Obra: <span className="font-medium">{inspection.work}</span></p>
                                                <p className="text-sm text-muted-foreground">Cerrado por: <span className="font-medium">{inspection.completionExecutor || 'Desconocido'}</span></p>
                                                <p className="text-xs text-muted-foreground mt-1">Fecha de Cierre: {formatDate(inspection.completedAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                {getRiskBadge(inspection.riskLevel)}
                                                {getStatusBadge(inspection.status)}
                                                <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">Bandeja Vacía</h3>
                                <p className="mt-2">No hay inspecciones pendientes de revisión en este momento.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

