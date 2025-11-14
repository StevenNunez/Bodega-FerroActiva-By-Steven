"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Inbox, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

// Helper para formatear fechas
const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};


export default function SupervisorAssignedChecklistsPage() {
    const { assignedChecklists } = useAppState();
    const { user } = useAuth();

    const myAssignedChecklists = useMemo(() => {
        if (!user || !assignedChecklists) return [];
        return assignedChecklists
            .filter(c => c.supervisorId === user.id)
            .sort((a, b) => {
                const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
                const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
                return dateB - dateA;
            });
    }, [assignedChecklists, user]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'assigned': return <Badge variant="secondary" className="bg-blue-500 text-white">Asignado</Badge>;
            case 'in-progress': return <Badge variant="secondary" className="bg-yellow-500 text-white">En Progreso</Badge>;
            case 'completed': return <Badge variant="default" className="bg-green-600 text-white">Completado</Badge>;
            case 'rejected': return <Badge variant="destructive">Rechazado</Badge>;
            case 'approved': return <Badge variant="default" className="bg-green-700 text-white">Aprobado por APR</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }


    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Mis Checklists Asignados"
                description="Aquí encontrarás todos los formularios y checklists que necesitas completar."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListChecks /> Tareas Pendientes</CardTitle>
                    <CardDescription>
                        Selecciona un checklist de la lista para comenzar a completarlo. Los checklists completados se enviarán para su revisión.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                        {myAssignedChecklists.length > 0 ? (
                            <div className="space-y-3 p-4">
                                {myAssignedChecklists.map(checklist => (
                                    <Link 
                                        key={checklist.id} 
                                        href={`/dashboard/safety/assigned-checklists/${checklist.id}`}
                                        className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex-grow">
                                            <h4 className="font-semibold">{checklist.templateTitle}</h4>
                                            <p className="text-sm text-muted-foreground">Obra/Proyecto: <span className="font-medium">{checklist.area}</span></p>
                                            <p className="text-xs text-muted-foreground mt-1">Asignado el: {formatDate(checklist.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            {getStatusBadge(checklist.status)}
                                            <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">¡Todo al día!</h3>
                                <p className="mt-2">No tienes checklists pendientes asignados en este momento.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
