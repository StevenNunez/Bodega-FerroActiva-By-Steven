
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, CheckCircle, Clock, ThumbsUp, ThumbsDown, ArrowRight, Inbox, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { isPast, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AssignedSafetyTask, SafetyInspection, User } from '@/modules/core/lib/data';

const formatDate = (date: Date | Timestamp | undefined | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusInfo = (status: string): { label: string; icon: React.ElementType; color: string } => {
    switch (status) {
        case 'assigned': return { label: 'Asignado', icon: Clock, color: 'bg-blue-500' };
        case 'completed': return { label: 'Para Revisión', icon: CheckCircle, color: 'bg-yellow-500' };
        case 'approved': return { label: 'Aprobado', icon: ThumbsUp, color: 'bg-green-600' };
        case 'rejected': return { label: 'Rechazado', icon: ThumbsDown, color: 'bg-red-600' };
        default: return { label: status, icon: ListChecks, color: 'bg-gray-500' };
    }
};

const getInspectionStatusInfo = (status: string): { label: string; color: string } => {
    switch(status) {
        case 'open': return { label: 'Abierta', color: 'bg-blue-500' };
        case 'in-progress': return { label: 'En Progreso', color: 'bg-yellow-500' };
        case 'completed': return { label: 'Completada', color: 'bg-green-600' };
        default: return { label: status, color: 'bg-gray-500' };
    }
}

const getRiskBadge = (level: string) => {
    switch (level) {
        case 'leve': return <Badge variant="secondary">Leve</Badge>;
        case 'grave': return <Badge variant="destructive">Grave</Badge>;
        case 'fatal': return <Badge variant="destructive" className="bg-black text-white">Fatal</Badge>;
        default: return null;
    }
}


export default function SafetyDashboardPage() {
    const { user } = useAuth();
    const { assignedChecklists, safetyInspections, users, can } = useAppState();

    const stats = useMemo(() => {
        const safeChecklists: AssignedSafetyTask[] = assignedChecklists || [];
        const safeInspections: SafetyInspection[] = safetyInspections || [];
        const totalChecklists = safeChecklists.length;
        const totalInspections = safeInspections.length;
        
        if (totalChecklists === 0 && totalInspections === 0) {
            return { 
                totalChecklists: 0, assigned: 0, forReview: 0, approved: 0,
                totalInspections: 0, inspectionsOpen: 0, inspectionsOverdue: 0,
            };
        }

        const assigned = safeChecklists.filter((c: AssignedSafetyTask) => c.status === 'assigned').length;
        const forReview = safeChecklists.filter((c: AssignedSafetyTask) => c.status === 'completed').length;
        const approved = safeChecklists.filter((c: AssignedSafetyTask) => c.status === 'approved').length;
        
        const inspectionsOpen = safeInspections.filter((i: SafetyInspection) => i.status === 'open').length;
        const inspectionsOverdue = safeInspections.filter((i: SafetyInspection) => i.status === 'open' && i.deadline && isPast((i.deadline as Timestamp).toDate())).length;

        return { 
            totalChecklists, assigned, forReview, approved,
            totalInspections, inspectionsOpen, inspectionsOverdue,
        };
    }, [assignedChecklists, safetyInspections]);

    const checklistsForReview = useMemo(() => {
        return (assignedChecklists || [])
            .filter((c: AssignedSafetyTask) => c.status === 'completed')
            .sort((a: AssignedSafetyTask, b: AssignedSafetyTask) => (((b.completedAt as any)?.toMillis() || 0) - ((a.completedAt as any)?.toMillis() || 0)))
            .slice(0, 5);
    }, [assignedChecklists]);
    
    const openInspections = useMemo(() => {
         return (safetyInspections || [])
            .filter((c: SafetyInspection) => c.status === 'open')
            .sort((a: SafetyInspection, b: SafetyInspection) => {
                const deadlineA = a.deadline ? (a.deadline as Timestamp).toMillis() : Infinity;
                const deadlineB = b.deadline ? (b.deadline as Timestamp).toMillis() : Infinity;
                return deadlineA - deadlineB;
            })
            .slice(0, 5);
    }, [safetyInspections]);

    const myRecentTasks = useMemo(() => {
        if (!user) return { checklists: [], inspections: [] };
        const myChecklists = (assignedChecklists || [])
            .filter((c: AssignedSafetyTask) => c.supervisorId === user.id && c.status === 'assigned')
            .sort((a: AssignedSafetyTask, b: AssignedSafetyTask) => (((b.createdAt as any)?.toMillis() || 0) - ((a.createdAt as any)?.toMillis() || 0)))
            .slice(0, 3);
        
        const myInspections = (safetyInspections || [])
            .filter((i: SafetyInspection) => i.assignedTo === user.id && i.status === 'open')
            .sort((a: SafetyInspection,b: SafetyInspection) => (((a.deadline as any)?.toMillis() || Infinity) - ((b.deadline as any)?.toMillis() || Infinity)))
            .slice(0, 3);
            
        return { checklists: myChecklists, inspections: myInspections };
    }, [assignedChecklists, safetyInspections, user]);

    const userMap = useMemo(() => new Map<string, string>((users || []).map((u: User) => [u.id, u.name])), [users]);

    const canReview = can('safety_checklists:review') || can('safety_inspections:review');
    const canBeAssigned = can('safety_checklists:complete') || can('safety_inspections:complete');

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Resumen de Prevención de Riesgos"
                description="Vista general del estado de los checklists e inspecciones de seguridad en la obra."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inspecciones Abiertas</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inspectionsOpen}</div>
                        <p className="text-xs text-muted-foreground">Tareas de seguridad activas.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">Inspecciones Vencidas</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats.inspectionsOverdue}</div>
                        <p className="text-xs text-muted-foreground">Tareas fuera de plazo.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Checklists Pendientes</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assigned}</div>
                        <p className="text-xs text-muted-foreground">Formularios por completar.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Checklists para Revisión</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.forReview}</div>
                        <p className="text-xs text-muted-foreground">Listos para tu aprobación.</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {canReview && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Inspecciones Urgentes por Resolver</CardTitle>
                            <CardDescription>Las tareas de seguridad abiertas más críticas o próximas a vencer.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {openInspections.length > 0 ? (
                                <div className="space-y-3">
                                    {openInspections.map((i: SafetyInspection) => (
                                        <Link key={i.id} href={`/dashboard/safety/assigned-inspections/${i.id}`} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="font-semibold">{i.description}</p>
                                                <p className="text-sm text-muted-foreground">Asignado a: {userMap.get(i.assignedTo) || 'Desconocido'}</p>
                                                {i.deadline && <p className={`text-xs ${isPast((i.deadline as Timestamp).toDate()) ? 'text-red-500 font-bold' : 'text-amber-500'}`}>
                                                    Vence {isPast((i.deadline as Timestamp).toDate()) ? 'hace' : 'en'} {formatDistanceToNow((i.deadline as Timestamp).toDate(), { locale: es, addSuffix: true })}
                                                </p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getRiskBadge(i.riskLevel)}
                                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    <Inbox className="h-12 w-12 mx-auto mb-2"/>
                                    <p>¡Todo en orden! No hay inspecciones de seguridad abiertas.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {canReview && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Checklists Pendientes de Revisión</CardTitle>
                            <CardDescription>Los últimos checklists completados por supervisores.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {checklistsForReview.length > 0 ? (
                                <div className="space-y-3">
                                    {checklistsForReview.map((c: AssignedSafetyTask) => (
                                        <Link key={c.id} href={`/dashboard/safety/review-checklists/${c.id}`} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="font-semibold">{c.templateTitle}</p>
                                                <p className="text-sm text-muted-foreground">Completado por: {userMap.get(c.supervisorId) || 'Desconocido'}</p>
                                                <p className="text-xs text-muted-foreground">Fecha: {formatDate(c.completedAt)}</p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    <Inbox className="h-12 w-12 mx-auto mb-2"/>
                                    <p>No hay checklists esperando revisión.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {canBeAssigned && (myRecentTasks.checklists.length > 0 || myRecentTasks.inspections.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mis Tareas de Seguridad Pendientes</CardTitle>
                        <CardDescription>Un resumen de tus checklists e inspecciones asignadas.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold mb-2">Checklists por Completar</h4>
                                {myRecentTasks.checklists.length > 0 ? (
                                    <div className="space-y-2">
                                        {myRecentTasks.checklists.map((c: AssignedSafetyTask) => (
                                            <Link key={c.id} href={`/dashboard/safety/assigned-checklists/${c.id}`} className="p-3 border rounded-md flex items-center justify-between text-sm hover:bg-muted/50">
                                                <span>{c.templateTitle}</span>
                                                <ArrowRight className="h-4 w-4"/>
                                            </Link>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-muted-foreground italic">No tienes checklists pendientes.</p>}
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Inspecciones por Resolver</h4>
                                {myRecentTasks.inspections.length > 0 ? (
                                    <div className="space-y-2">
                                         {myRecentTasks.inspections.map((i: SafetyInspection) => (
                                            <Link key={i.id} href={`/dashboard/safety/assigned-inspections/${i.id}`} className="p-3 border rounded-md flex items-center justify-between text-sm hover:bg-muted/50">
                                                <span className="truncate">{i.description}</span>
                                                <ArrowRight className="h-4 w-4"/>
                                            </Link>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-muted-foreground italic">No tienes inspecciones pendientes.</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
