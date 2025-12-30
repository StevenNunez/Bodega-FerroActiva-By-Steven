'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth, useAppState } from '@/modules/core/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  BarChart3,
  CheckSquare,
  Construction,
  FolderTree,
  GanttChartSquare,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { WorkItem } from '@/modules/core/lib/data';
import { StatCard } from '@/components/admin/stat-card';
import { Progress } from '@/components/ui/progress';

interface ModuleLinkCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const ModuleLinkCard: React.FC<ModuleLinkCardProps> = ({ href, icon: Icon, title, description }) => (
  <Link href={href} className="group block">
    <Card className="h-full transition-all hover:border-primary hover:shadow-md hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  </Link>
);


export default function ConstructionControlHubPage() {
  const { can } = useAuth();
  const { workItems } = useAppState();

  const stats = React.useMemo(() => {
    const items = workItems || [];
    const projectRoot = items.find(item => item.type === 'project');
    const overallProgress = projectRoot?.progress ?? 0;
    const pendingReview = items.filter(item => item.status === 'pending-quality-review').length;
    const completed = items.filter(item => item.status === 'completed').length;
    const inProgress = items.filter(item => item.status === 'in-progress').length;

    return { overallProgress, pendingReview, completed, inProgress };
  }, [workItems]);


  if (!can('module_construction_control:view')) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tienes los permisos necesarios para acceder a este módulo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8 fade-in">
      <PageHeader
        title="Módulo de Control de Obra"
        description="Supervisa el ciclo de vida completo de la construcción, desde la planificación hasta la entrega."
      />
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/> Progreso General del Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
            <Progress value={stats.overallProgress} className="h-4" />
            <p className="text-right mt-2 text-xl font-bold text-primary">{stats.overallProgress.toFixed(2)}%</p>
        </CardContent>
      </Card>
      
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Partidas en Progreso" value={stats.inProgress} icon={Construction} />
          <StatCard title="Pendientes de Revisión" value={stats.pendingReview} icon={ListChecks} color="text-amber-500"/>
          <StatCard title="Partidas Completadas" value={stats.completed} icon={CheckSquare} color="text-green-500" />
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModuleLinkCard
          href="/dashboard/construction-control/wbs"
          icon={FolderTree}
          title="Partidas (EDT / WBS)"
          description="Gestiona la estructura de la obra y registra el avance físico."
        />
        <ModuleLinkCard
          href="/dashboard/construction-control/gantt"
          icon={GanttChartSquare}
          title="Carta Gantt y Curva S"
          description="Visualiza el cronograma, dependencias y el rendimiento del proyecto."
        />
        <ModuleLinkCard
          href="/dashboard/construction-control/revisar-protocolos"
          icon={CheckSquare}
          title="Revisar Protocolos"
          description="Bandeja de entrada para la aprobación de partidas finalizadas."
        />
        <ModuleLinkCard
          href="/dashboard/construction-control/mis-protocolos"
          icon={ListChecks}
          title="Mis Protocolos Enviados"
          description="Revisa el estado de las partidas que has enviado a calidad."
        />
      </div>
    </div>
  );
}
