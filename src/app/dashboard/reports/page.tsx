
'use client';
import * as React from 'react';
import Link from 'next/link';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { BarChart3, FileBarChart, AlertCircle, TrendingUp, UserCheck, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StatCard } from '@/components/admin/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaterialRequest, Material, User } from '@/modules/core/lib/data';

type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
    items?: { materialId: string; quantity: number }[];
};

interface ReportCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  permission: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ href, icon: Icon, title, description, permission }) => {
  const { can } = useAppState();

  if (!can(permission as any)) {
    return null;
  }

  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-8 w-8 transition-transform group-hover:scale-110" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
};

export default function ReportsHubPage() {
  const { can, user, requests, materials, users } = useAppState();
  const router = useRouter();

  const approvedRequests = React.useMemo(() => {
    return (requests || []).filter((req: MaterialRequest) => req.status === 'approved') as CompatibleMaterialRequest[];
  }, [requests]);

  const stats = React.useMemo(() => {
    const safeMaterials: Material[] = materials || [];
    const safeUsers: User[] = users || [];

    if (!approvedRequests.length || !safeMaterials.length || !safeUsers.length) {
      return {
        totalApproved: 0,
        topMaterial: 'N/A',
        topSupervisor: 'N/A',
        topMaterials: [],
        topSupervisors: [],
      };
    }
    
    const materialConsumption = new Map<string, number>();
    const supervisorActivity = new Map<string, number>();

    approvedRequests.forEach((req: CompatibleMaterialRequest) => {
      const supervisorId = req.supervisorId;
      if (supervisorId) {
        supervisorActivity.set(supervisorId, (supervisorActivity.get(supervisorId) || 0) + 1);
      }

      const items = req.items || (req.materialId ? [{ materialId: req.materialId, quantity: req.quantity || 0 }] : []);
      items.forEach((item: { materialId: string; quantity: number; }) => {
        materialConsumption.set(item.materialId, (materialConsumption.get(item.materialId) || 0) + item.quantity);
      });
    });

    const topMaterials = Array.from(materialConsumption.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([materialId, quantity]) => ({
        name: safeMaterials.find((m: Material) => m.id === materialId)?.name || 'Desconocido',
        quantity,
      }));

    const topSupervisors = Array.from(supervisorActivity.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({
        name: safeUsers.find((u: User) => u.id === userId)?.name || 'Desconocido',
        count,
      }));

    return {
      totalApproved: approvedRequests.length,
      topMaterial: topMaterials[0]?.name || 'N/A',
      topSupervisor: topSupervisors[0]?.name || 'N/A',
      topMaterials,
      topSupervisors,
    };
  }, [approvedRequests, materials, users]);

  const reportModules: ReportCardProps[] = [
    { 
      href: '/dashboard/reports/stats', 
      icon: BarChart3, 
      title: "Estadísticas de Consumo", 
      description: "Analiza el uso de materiales por categoría, obra o fecha.", 
      permission: 'reports:view' 
    },
    { 
      href: '/dashboard/reports/deliveries', 
      icon: FileBarChart, 
      title: "Reporte de Entregas", 
      description: "Genera informes detallados de todas las entregas de materiales.", 
      permission: 'reports:view'
    },
  ];
  
  const visibleModules = reportModules.filter(m => can(m.permission as any));


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Módulo de Reportes"
        description="Analiza los datos clave de consumo y entregas de tu operación."
      />

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Solicitudes Aprobadas" value={stats.totalApproved} icon={TrendingUp} />
            <StatCard title="Material Más Solicitado" value={stats.topMaterial} icon={Package} />
            <StatCard title="Top Solicitante" value={stats.topSupervisor} icon={UserCheck} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Top 5 Materiales Consumidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right">Cantidad Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.topMaterials.map((material, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{material.name}</TableCell>
                                    <TableCell className="text-right font-mono">{material.quantity.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top 5 Solicitantes</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Nº de Solicitudes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.topSupervisors.map((user, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell className="text-right font-mono">{user.count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

      
       {visibleModules.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin Permisos de Acción</AlertTitle>
            <AlertDescription>
              Puedes ver este módulo, pero tu rol no tiene permisos para realizar acciones aquí. Contacta a un administrador si crees que esto es un error.
            </AlertDescription>
          </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleModules.map(module => (
            <ReportCard key={module.href} {...module} />
            ))}
        </div>
      )}

    </div>
  );
}
