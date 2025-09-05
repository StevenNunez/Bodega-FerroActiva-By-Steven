
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CreateMaterialForm } from "@/components/admin/create-material-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackageCheck, PackageOpen } from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function AdminMaterialsPage() {
  const { materials, purchaseRequests, users, requests } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) {
      return materials;
    }
    return materials.filter((material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);
  
  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
      if (!date) return null;
      return date instanceof Timestamp ? date.toDate() : date;
  }
  
  const recentReceived = useMemo(() => {
    return purchaseRequests
        .filter(pr => pr.status === 'received' && pr.receivedAt)
        .sort((a, b) => getDate(b.receivedAt!)!.getTime() - getDate(a.receivedAt!)!.getTime())
        .slice(0, 10);
  }, [purchaseRequests]);

  const recentApprovedRequests = useMemo(() => {
      return requests
        .filter(r => r.status === 'approved')
        .sort((a,b) => getDate(b.createdAt)!.getTime() - getDate(a.createdAt)!.getTime())
        .slice(0, 5);
  }, [requests]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Materiales"
        description="Administra el inventario de materiales de la bodega."
      />

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Inventario de Materiales</CardTitle>
                    <CardDescription>Lista completa de todos los materiales y su stock actual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input 
                        placeholder="Buscar material por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ScrollArea className="h-96 border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>Nombre del Material</TableHead>
                                    <TableHead className="text-right">Stock Disponible</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length > 0 ? (
                                    filteredMaterials.map(material => (
                                        <TableRow key={material.id}>
                                            <TableCell className="font-medium">{material.name}</TableCell>
                                            <TableCell className="text-right font-mono">{material.stock.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
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
            <Card>
              <CardHeader>
                <CardTitle>Añadir Nuevo Material</CardTitle>
                <CardDescription>Agrega nuevos tipos de materiales al inventario.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateMaterialForm />
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PackageOpen/> Últimas Salidas de Bodega</CardTitle>
                    <CardDescription>Las 5 solicitudes de material más recientes que fueron aprobadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                    {recentApprovedRequests.length > 0 ? (
                        <ul className="space-y-3 pr-4">
                            {recentApprovedRequests.map(req => {
                                const material = materials.find(m => m.id === req.materialId);
                                const supervisor = users.find(u => u.id === req.supervisorId);
                                const createdAtDate = getDate(req.createdAt);
                                return (
                                <li key={req.id} className="text-sm p-3 rounded-lg border bg-muted/50">
                                    <p className="font-semibold">{material?.name} <span className="font-normal text-primary">({req.quantity} uds)</span></p>
                                    <p className="text-xs text-muted-foreground mt-1">Para: {req.area} (Solicitado por {supervisor?.name})</p>
                                     <p className="text-xs text-muted-foreground mt-2 font-mono">
                                        Aprobado: {createdAtDate ? createdAtDate.toLocaleString() : 'N/A'}
                                    </p>
                                </li>
                            )})}
                        </ul>
                    ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-72">
                            <p>No hay salidas recientes.</p>
                        </div>
                    )}
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PackageCheck /> Últimos Ingresos a Bodega</CardTitle>
                    <CardDescription>Registro de los materiales de compra más recientes marcados como recibidos.</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentReceived.length > 0 ? (
                        <ScrollArea className="h-72">
                            <ul className="space-y-3 pr-4">
                                {recentReceived.map(req => {
                                    const supervisor = users.find(u => u.id === req.supervisorId);
                                    const receivedAtDate = getDate(req.receivedAt);
                                    return (
                                        <li key={req.id} className="text-sm p-3 rounded-lg border bg-muted/50">
                                            <p className="font-semibold">{req.materialName} <span className="font-normal text-primary">({req.quantity} uds)</span></p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Solicitado por <span className="font-medium">{supervisor?.name || 'Desconocido'}</span> para: "{req.justification}"
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                                                Ingreso: {receivedAtDate ? receivedAtDate.toLocaleString() : 'N/A'}
                                            </p>
                                        </li>
                                    )
                                })}
                            </ul>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-72">
                            <p>No hay ingresos recientes.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}