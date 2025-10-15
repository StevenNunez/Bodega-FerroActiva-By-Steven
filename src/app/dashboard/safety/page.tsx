
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, CheckCircle, Clock, ThumbsUp, ThumbsDown, ArrowRight, Inbox } from 'lucide-react';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';

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

export default function SafetyDashboardPage() {
    const { user } = useAuth();
    const { assignedChecklists, users } = useAppState();

    const stats = useMemo(() => {
        const total = assignedChecklists.length;
        if (total === 0) {
            return { total: 0, assigned: 0, completed: 0, approved: 0, rejected: 0, approvedPercentage: 0 };
        }
        const assigned = assignedChecklists.filter(c => c.status === 'assigned').length;
        const completed = assignedChecklists.filter(c => c.status === 'completed').length;
        const approved = assignedChecklists.filter(c => c.status === 'approved').length;
        const rejected = assignedChecklists.filter(c => c.status === 'rejected').length;
        const approvedPercentage = Math.round((approved / total) * 100);

        return { total, assigned, completed, approved, rejected, approvedPercentage };
    }, [assignedChecklists]);

    const checklistsForReview = useMemo(() => {
        return assignedChecklists
            .filter(c => c.status === 'completed')
            .sort((a, b) => (b.completedAt as Date).getTime() - (a.completedAt as Date).getTime())
            .slice(0, 5);
    }, [assignedChecklists]);

    const myRecentChecklists = useMemo(() => {
        if (!user) return [];
        return assignedChecklists
            .filter(c => c.supervisorId === user.id)
            .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
            .slice(0, 5);
    }, [assignedChecklists, user]);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const canReview = user?.role === 'apr' || user?.role === 'admin';
    const isSupervisor = user?.role === 'supervisor';

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Resumen de Prevención de Riesgos"
                description="Vista general del estado de los checklists de seguridad en la obra."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Resumen General de Checklists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {[{label: 'Asignados', value: stats.assigned, icon: Clock}, {label: 'Para Revisión', value: stats.completed, icon: CheckCircle}, {label: 'Aprobados', value: stats.approved, icon: ThumbsUp}, {label: 'Rechazados', value: stats.rejected, icon: ThumbsDown}].map(stat => (
                            <div key={stat.label} className="p-4 bg-muted rounded-lg">
                                <stat.icon className="h-6 w-6 mx-auto text-muted-foreground mb-2"/>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Progreso de Aprobación</span>
                            <span>{stats.approvedPercentage}%</span>
                        </div>
                        <Progress value={stats.approvedPercentage} aria-label={`${stats.approvedPercentage}% de checklists aprobados`} />
                    </div>
                </CardContent>
            </Card>

            {canReview && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Checklists Pendientes de Revisión</CardTitle>
                        <CardDescription>Los últimos 5 checklists completados por supervisores.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {checklistsForReview.length > 0 ? (
                            <div className="space-y-3">
                                {checklistsForReview.map(c => (
                                    <Link key={c.id} href={`/dashboard/safety/review/${c.id}`} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
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
                                <p>¡Bandeja de entrada limpia! No hay checklists esperando revisión.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {isSupervisor && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mis Checklists Asignados Recientes</CardTitle>
                    </CardHeader>
                     <CardContent>
                        {myRecentChecklists.length > 0 ? (
                            <div className="space-y-3">
                                {myRecentChecklists.map(c => {
                                    const { label, icon: Icon, color } = getStatusInfo(c.status);
                                    return (
                                        <Link key={c.id} href={`/dashboard/safety/assigned-checklists/${c.id}`} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="font-semibold">{c.templateTitle}</p>
                                                <p className="text-sm text-muted-foreground">Obra: {c.work}</p>
                                                <p className="text-xs text-muted-foreground">Asignado: {formatDate(c.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={color}><Icon className="mr-1 h-3 w-3"/>{label}</Badge>
                                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="text-center text-muted-foreground p-8">
                                <Inbox className="h-12 w-12 mx-auto mb-2"/>
                                <p>No tienes checklists asignados en este momento.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            
        </div>
    );
}
