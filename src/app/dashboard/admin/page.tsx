
"use client";
import * as React from 'react';
import Link from 'next/link';
import { useAppState } from '@/modules/core/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Package,
  Wrench,
  ArrowRight,
  AlertTriangle,
  FolderTree,
  Ruler,
  ShoppingCart,
  Briefcase,
  PackagePlus,
  FileText,
  Edit,
  CalendarCheck,
  Clock,
  BookOpen,
  FileBarChart,
  User as UserIcon,
  ListChecks,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ClipboardPaste,
  BarChart3,
  QrCode,
  Undo2,
  HandCoins,
} from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import type {
  Material,
  MaterialRequest,
  ReturnRequest,
  StockMovement,
  Tool,
  ToolLog,
  User,
} from '@/modules/core/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
  items?: { materialId: string; quantity: number }[];
};

export default function WarehouseHubPage() {
  const {
    materials,
    tools,
    requests,
    toolLogs,
    returnRequests,
    stockMovements,
    users,
    can,
    isLoading,
  } = useAppState();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');

  const toDate = (
    date: Date | Timestamp | null | undefined
  ): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (
    date: Date | Timestamp | null | undefined
  ): string => {
    const jsDate = toDate(date);
    if (!jsDate) return 'Fecha no disponible';
    return jsDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const materialMap = React.useMemo(
    () => new Map((materials || []).map((m: Material) => [m.id, m])),
    [materials]
  );

  const stats = React.useMemo(() => {
    const safeMaterials: Material[] = materials || [];
    const safeTools: Tool[] = tools || [];
    const safeToolLogs: ToolLog[] = toolLogs || [];

    const checkedOutToolsCount = new Set(
      safeToolLogs
        .filter((log: ToolLog) => log.returnDate === null)
        .map((log: ToolLog) => log.toolId)
    ).size;

    return {
      totalMaterials: safeMaterials.length,
      totalTools: safeTools.length,
      toolsInUse: checkedOutToolsCount,
      toolsAvailable: safeTools.length - checkedOutToolsCount,
    };
  }, [materials, tools, toolLogs]);

  const lowStockMaterials = React.useMemo(() => {
    if (!materials) return [];
    return materials
      .filter((m: Material) => m.stock < 10)
      .sort((a: Material, b: Material) => a.stock - b.stock)
      .slice(0, 5);
  }, [materials]);

  const recentApprovedRequests = React.useMemo(() => {
    if (!requests) return [];
    return (requests as CompatibleMaterialRequest[])
      .filter(
        (r: CompatibleMaterialRequest) =>
          r.status === 'approved' && (r.approvalDate || r.createdAt)
      )
      .sort((a: CompatibleMaterialRequest, b: CompatibleMaterialRequest) => {
        const dateA = toDate(a.approvalDate || a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.approvalDate || b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [requests]);

  const recentEntries = React.useMemo(() => {
    const completedReturns = (returnRequests || [])
      .filter((r: ReturnRequest) => r.status === 'completed' && r.completionDate)
      .map((r: ReturnRequest) => ({
        id: r.id,
        date: toDate(r.completionDate),
        type: 'Devolución',
        description: `${r.quantity} x ${r.materialName}`,
        user: r.supervisorName,
      }));

    const manualEntries = (stockMovements || [])
      .filter(
        (m: StockMovement) =>
          m.type === 'manual-entry' && m.quantityChange > 0
      )
      .map((m: StockMovement) => ({
        id: m.id,
        date: toDate(m.date),
        type: 'Ingreso Manual',
        description: `${m.quantityChange} x ${m.materialName}`,
        user: m.userName,
      }));

    return [...completedReturns, ...manualEntries]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 5);
  }, [returnRequests, stockMovements]);

  const navigationCards = [
    {
      href: '/dashboard/admin/tools',
      icon: Wrench,
      title: 'Gestión de Herramientas',
      description: 'Crea, edita y gestiona el inventario de herramientas.',
      permission: 'tools:create',
    },
    {
      href: '/dashboard/admin/materials',
      icon: Package,
      title: 'Gestión de Materiales',
      description:
        'Administra el catálogo y stock de todos los materiales.',
      permission: 'materials:create',
    },
    {
      href: '/dashboard/purchasing/categories',
      icon: FolderTree,
      title: 'Gestión de Categorías',
      description: 'Organiza tus materiales y proveedores.',
      permission: 'categories:create',
    },
    {
      href: '/dashboard/admin/units',
      icon: Ruler,
      title: 'Gestión de Unidades',
      description: 'Define las unidades de medida para tus materiales.',
      permission: 'units:create',
    },
    {
      href: '/dashboard/purchasing',
      icon: ShoppingCart,
      title: 'Ir a Módulo de Compras',
      description:
        'Gestiona solicitudes, lotes y órdenes de compra.',
      permission: 'module_purchasing:view',
    },
  ];

  const visibleNavCards = navigationCards.filter((m) =>
    can(m.permission as any)
  );

  const categories = React.useMemo(() => {
    const allCats = (materials || [])
      .map((m: Material) => m.category)
      .filter(
        (cat: string | null | undefined): cat is string =>
          typeof cat === 'string'
      );
    const uniqueCats = [...new Set<string>(allCats)];
    return uniqueCats.sort();
  }, [materials]);

  const filteredMaterials = React.useMemo(() => {
    let filtered = (materials || []).filter((m: Material) => !m.archived);
    if (searchTerm) {
      filtered = filtered.filter((material: Material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(
        (material: Material) => material.category === categoryFilter
      );
    }
    return filtered;
  }, [materials, searchTerm, categoryFilter]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Resumen de Bodega"
        description="Una vista rápida del estado actual de tu inventario y actividad reciente."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Materiales" value={stats.totalMaterials} icon={Package} />
        <StatCard title="Herramientas Totales" value={stats.totalTools} icon={Wrench} />
        <StatCard title="Herramientas en Uso" value={stats.toolsInUse} icon={ArrowRight} color="text-red-500" />
        <StatCard title="Herramientas Disponibles" value={stats.toolsAvailable} icon={ArrowRight} color="text-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <AlertTriangle /> Alertas de Stock Bajo
              </CardTitle>
              <CardDescription>
                Materiales que están por agotarse (menos de 10 unidades).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockMaterials.length > 0 ? (
                <ul className="space-y-3">
                  {lowStockMaterials.map((material: Material) => (
                    <li
                      key={material.id}
                      className="text-sm p-3 rounded-lg border bg-muted/50 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold">{material.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {material.category}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-lg text-red-500">
                        {material.stock.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                  <p>¡Todo en orden! No hay materiales con stock bajo.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package /> Stock Disponible en Bodega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Buscar material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas las categorías
                    </SelectItem>
                    {categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-96 border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Stock
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="h-24 text-center"
                        >
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : filteredMaterials.length > 0 ? (
                      filteredMaterials.map((material: Material) => (
                        <TableRow key={material.id}>
                          <TableCell>
                            <p className="font-medium">{material.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {material.category}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {material.stock.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="h-24 text-center"
                        >
                          No se encontraron materiales.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {visibleNavCards.map((module) => (
            <Link href={module.href} className="group" key={module.href}>
              <Card className="h-full transition-all duration-300 ease-in-out hover:border-primary hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <module.icon className="h-6 w-6 transition-transform group-hover:scale-110" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

    