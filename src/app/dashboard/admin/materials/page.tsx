"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider"; // Asumiendo que useAuth está disponible
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CreateMaterialForm } from "@/components/admin/create-material-form";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Importar ScrollBar
import { PackageCheck, PackageOpen, Edit } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { Material } from "@/lib/data";
import { EditMaterialForm } from "@/components/admin/edit-material-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast"; // Asumiendo que existe para errores
import { Loader2 } from "lucide-react";

export default function AdminMaterialsPage() {
  const { materials, purchaseRequests, users, requests, suppliers, isLoading } = useAppState();
  const { user: authUser } = useAuth(); // Asumiendo useAuth como en el anterior
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // Nuevo: filtro por categoría
  const [currentPage, setCurrentPage] = useState(1); // Nuevo: para paginación
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const itemsPerPage = 10; // Configurable

  // Verificación de autenticación
  if (!authUser || !authUser.id) {
    toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-destructive">Por favor, inicia sesión para continuar.</p>
      </div>
    );
  }

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Obtener categorías únicas para el filtro (de materials)
  const categories = useMemo(() => {
    const uniqueCats = [...new Set(materials.map((m) => m.category))];
    return ["all", ...uniqueCats].sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let filtered = materials;
    if (searchTerm) {
      filtered = filtered.filter((material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((material) => material.category === categoryFilter);
    }
    return filtered;
  }, [materials, searchTerm, categoryFilter]);

  // Paginación
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaterials, currentPage]);

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  const getDate = (date: Date | Timestamp | null | undefined): string => {
    if (!date) return "Fecha no disponible";
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const recentReceived = useMemo(() => {
    return purchaseRequests
      .filter((pr) => pr.status === "received" && pr.receivedAt)
      .sort((a, b) => {
        const dateA = getDate(b.receivedAt);
        const dateB = getDate(a.receivedAt);
        return new Date(dateB).getTime() - new Date(dateA).getTime(); // Orden descendente
      })
      .slice(0, 5);
  }, [purchaseRequests]);

  const recentApprovedRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === "approved")
      .sort((a, b) => {
        const dateA = getDate(b.createdAt);
        const dateB = getDate(a.createdAt);
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })
      .slice(0, 5);
  }, [requests]);

  // Memoizado para evitar recalcular en cada render
  const getSupplierName = useMemo(() => {
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    return (supplierId: string | null | undefined) => {
      if (!supplierId) return "N/A";
      return supplierMap.get(supplierId) || "Desconocido";
    };
  }, [suppliers]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Materiales"
        description="Administra el inventario de materiales de la bodega."
      />

      {editingMaterial && (
        <EditMaterialForm
          material={editingMaterial}
          isOpen={!!editingMaterial}
          onClose={() => setEditingMaterial(null)}
        />
      )}

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inventario de Materiales</CardTitle>
              <CardDescription>Lista completa de todos los materiales y su stock actual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Buscar material por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar material por nombre"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "Todas" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-96 border rounded-md whitespace-nowrap">
                <div className="min-w-[800px]"> {/* Fuerza ancho para activar scroll horizontal */}
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-[250px]">Nombre</TableHead>
                        <TableHead className="w-[150px]">Categoría</TableHead>
                        <TableHead className="w-[200px]">Proveedor</TableHead>
                        <TableHead className="w-[100px] text-center">Unidad</TableHead>
                        <TableHead className="w-[120px] text-right">Stock</TableHead>
                        <TableHead className="w-[100px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMaterials.length > 0 ? (
                        paginatedMaterials.map((material) => (
                          <TableRow key={material.id}>
                            <TableCell className="font-medium max-w-[250px] truncate">
                              {material.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {material.category}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {getSupplierName(material.supplierId)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {material.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {material.stock.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMaterial(material)}
                                aria-label={`Editar material ${material.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No se encontraron materiales.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" /> {/* Barra horizontal explícita */}
                <ScrollBar orientation="vertical" /> {/* Barra vertical para completitud */}
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </Button>
                  <span>Página {currentPage} de {totalPages}</span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Añadir Nuevo Material</CardTitle>
              <CardDescription>
                Agrega nuevos tipos de materiales al inventario. Cada ingreso quedará registrado en el historial de movimientos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateMaterialForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageOpen /> Últimas Salidas de Bodega
              </CardTitle>
              <CardDescription>Las 5 solicitudes de material más recientes que fueron aprobadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[20rem]">
                {recentApprovedRequests.length > 0 ? (
                  <ul className="space-y-3 pr-4">
                    {recentApprovedRequests.map((req) => {
                      const material = materials.find((m) => m.id === req.materialId);
                      const supervisor = users.find((u) => u.id === req.supervisorId);
                      const createdAtDate = getDate(req.createdAt);
                      return (
                        <li key={req.id} className="text-sm p-3 rounded-lg border bg-muted/50">
                          <p className="font-semibold max-w-full truncate">
                            {material?.name} <span className="font-normal text-primary">({req.quantity} uds)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                            Para: {req.area} (Solicitado por {supervisor?.name})
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            Aprobado: {createdAtDate}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                    <p>No hay salidas recientes.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck /> Últimos Ingresos a Bodega
              </CardTitle>
              <CardDescription>Registro de los materiales de compra más recientes marcados como recibidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[20rem]">
                {recentReceived.length > 0 ? (
                  <ul className="space-y-3 pr-4">
                    {recentReceived.map((req) => {
                      const supervisor = users.find((u) => u.id === req.supervisorId);
                      const receivedAtDate = getDate(req.receivedAt);
                      return (
                        <li key={req.id} className="text-sm p-3 rounded-lg border bg-muted/50">
                          <p className="font-semibold max-w-full truncate">
                            {req.materialName} <span className="font-normal text-primary">({req.quantity} uds)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                            Justificación: <span className="font-medium">"{req.justification}"</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            Ingreso: {receivedAtDate}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                    <p>No hay ingresos recientes.</p>
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