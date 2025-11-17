"use client";

import React, { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReviewChecklistsPage() {
    const { assignedChecklists, users, isLoading, deleteAssignedChecklist } = useAppState();
    const { user: authUser } = useAuth();
    
    const userMap = useMemo(() => new Map((users || []).map(u => [u.id, u.name])), [users]);

    const checklistsToReview = useMemo(() => {
        if (!assignedChecklists) return [];
        return assignedChecklists
            .filter(c => c.status === 'completed' || c.status === 'approved' || c.status === 'rejected')
            .sort((a, b) => {
                const dateA = (a.completedAt || a.createdAt) as Date;
                const dateB = (b.completedAt || b.createdAt) as Date;
                return dateB.getTime() - dateA.getTime();
            });
    }, [assignedChecklists]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary" className="bg-yellow-500 text-white">Listo para Revisar</Badge>;
            case 'approved': return <Badge variant="default" className="bg-green-600 text-white">Aprobado</Badge>;
            case 'rejected': return <Badge variant="destructive">Rechazado</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };
    
    const handleDelete = async (id: string) => {
        try {
            await deleteAssignedChecklist(id);
        } catch (error) {
            console.error("Failed to delete assigned checklist", error);
        }
    };

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Revisión de Checklists"
                description="Aquí puedes ver, aprobar o rechazar los checklists completados por los supervisores."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Bandeja de Entrada de Revisiones</CardTitle>
                    <CardDescription>
                        Los checklists completados por los supervisores aparecerán aquí para tu revisión y aprobación final.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                        {checklistsToReview.length > 0 ? (
                            <div className="space-y-3 p-4">
                                {checklistsToReview.map(checklist => (
                                    <div key={checklist.id} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <Link href={`/dashboard/safety/review-checklists/${checklist.id}`} className="flex-grow hover:bg-muted/50 transition-colors -m-4 p-4 rounded-lg">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold">{checklist.templateTitle}</h4>
                                                    <p className="text-sm text-muted-foreground">Obra: <span className="font-medium">{checklist.area}</span></p>
                                                    <p className="text-sm text-muted-foreground">Completado por: <span className="font-medium">{userMap.get(checklist.supervisorId) || 'Desconocido'}</span></p>
                                                    <p className="text-xs text-muted-foreground mt-1">Enviado el: {formatDate(checklist.completedAt)}</p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    {getStatusBadge(checklist.status)}
                                                    <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                                                </div>
                                            </div>
                                        </Link>
                                         {authUser?.role === 'admin' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar esta revisión?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción eliminará permanentemente el checklist asignado. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(checklist.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Sí, eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-12">
                                <Inbox className="h-16 w-16 mb-4"/>
                                <h3 className="text-xl font-semibold">Bandeja de Entrada Vacía</h3>
                                <p className="mt-2">No hay checklists pendientes de revisión en este momento.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
