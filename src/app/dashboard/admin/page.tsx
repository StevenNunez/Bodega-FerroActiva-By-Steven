
"use client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Wrench, Users, Package, AlertTriangle, PackageSearch } from "lucide-react";
import { useAppState } from "@/contexts/app-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ToolCheckoutCard } from "@/components/admin/tool-checkout-card";
import type { MaterialRequest } from "@/lib/data";
import { Input } from "@/components/ui/input";

type CompatibleMaterialRequest = MaterialRequest & {
    materialId?: string;
    quantity?: number;
};
export default function AdminPage() {
  const { requests, tools, toolLogs, users, materials, approveRequest } = useAppState();
  const { toast } = useToast();  
  const materialMap = React.useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const checkedOutTools = toolLogs.filter(log => log.returnDate === null);
  const lowStockMaterials = materials.filter(m => m.stock < 100);
  
  const getToolCheckoutInfo = (toolId: string) => {
    const log = checkedOutTools.find(log => log.toolId === toolId);
    if (!log) return { status: "Disponible" };
    const worker = users.find(u => u.id === log.workerId);
    return { status: "Ocupado", workerName: worker?.name || "Desconocido" };
  };
  
  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest(requestId);
      toast({ title: "Solicitud Aprobada", description: "El stock ha sido actualizado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al aprobar", description: error?.message || "No se pudo completar la acción." });
    }
  };  
  
  const [toolSearchTerm, setToolSearchTerm] = React.useState("");

  const filteredTools = React.useMemo(() => {
    return tools.filter(tool => 
        tool.name.toLowerCase().includes(toolSearchTerm.toLowerCase())
    );
  }, [tools, toolSearchTerm]);
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Resumen de Administrador" description="Vista general del estado de la bodega y acciones rápidas." />  

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 grid gap-8">
        <ToolCheckoutCard />
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Materiales Pendientes</CardTitle>
            <CardDescription>Revisa y aprueba las solicitudes pendientes para descontar del stock.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
                <ScrollArea className="h-72">
                    <ul className="space-y-4 pr-4">
                        {(pendingRequests as CompatibleMaterialRequest[]).map(req => {
                            const supervisor = users.find(u => u.id === req.supervisorId);
                            return (
                                <li key={req.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 rounded-lg bg-secondary gap-2">
                                    <div className="flex-grow space-y-2">
                                        <ul className="list-disc list-inside pl-2 space-y-1">
                                            {req.items && Array.isArray(req.items) ? (
                                                req.items.map(item => (
                                                    <li key={item.materialId} className="text-sm font-medium">
                                                       <span className="font-semibold">{materialMap.get(item.materialId)?.name || "N/A"}</span> <span className="text-primary">({item.quantity} uds)</span>
                                                    </li>
                                                ))
                                            ) : (
                                                 <li className="text-sm font-medium">
                                                    <span className="font-semibold">{materialMap.get(req.materialId || '')?.name || "N/A"}</span> <span className="text-primary">({req.quantity} uds)</span>
                                                </li>
                                            )}
                                        </ul>
                                        <p className="text-xs text-muted-foreground">Solicitado por: {supervisor?.name} para {req.area}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleApprove(req.id)} className="w-full sm:w-auto self-end sm:self-center">Aprobar</Button>
                                </li>
                            )
                        })}
                    </ul>
                </ScrollArea>
            ) : (
                <div className="text-sm text-muted-foreground text-center py-8 h-72 flex flex-col items-center justify-center">
                    <Bell className="h-10 w-10 mb-2"/>
                    <p>No hay solicitudes pendientes.</p>
                </div>
            )}
          </CardContent>
        </Card>
    </div>
    <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
             <Link href="/dashboard/admin/users" className="text-xs text-muted-foreground hover:underline">
              Gestionar usuarios
            </Link>
          </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Herramientas Totales</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{tools.length}</div>
                <Link href="/dashboard/admin/tools" className="text-xs text-muted-foreground hover:underline">
                Gestionar herramientas
                </Link>
            </CardContent>
        </Card>
        <Card className="border-amber-500/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500"><AlertTriangle /> Materiales con Bajo Stock</CardTitle>
                <CardDescription>Materiales con menos de 100 unidades disponibles.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-60">
                    {lowStockMaterials.length > 0 ? (
                        <ul className="space-y-3 pr-2">
                            {lowStockMaterials.map(mat => (
                                <li key={mat.id} className="flex justify-between items-center text-sm p-2 rounded-md border border-amber-500/20">
                                    <span>{mat.name}</span>
                                    <span className="font-bold text-amber-500">{mat.stock}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-8">
                            <PackageSearch className="h-10 w-10 mb-2"/>
                            <p>No hay materiales con bajo stock.</p>
                        </div>
                    )}
                 </ScrollArea>
            </CardContent>
        </Card>
    </div>
  </div>
</div>
  );
}
