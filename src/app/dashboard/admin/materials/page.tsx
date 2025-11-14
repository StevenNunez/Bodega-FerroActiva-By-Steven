"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CreateMaterialForm } from "@/components/admin/create-material-form";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PackageCheck, PackageOpen, Edit, Trash2, Archive } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { Material, MaterialRequest, PurchaseRequest, User, Supplier } from "@/modules/core/lib/data";
import { EditMaterialForm } from "@/components/admin/edit-material-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/modules/core/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type CompatibleMaterialRequest = MaterialRequest & {
  materialId?: string;
  quantity?: number;
  items?: { materialId: string; quantity: number }[];
};

export default function AdminMaterialsPage() {
  const { materials, purchaseRequests, users, requests, suppliers, isLoading, deleteMaterial, updateMaterial, can } = useAppState();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const itemsPerPage = 10;

  const canCreate = can('materials:create');
  const canEdit = can('materials:edit');
  const canDelete = can('materials:delete');
  const canArchive = can('materials:archive');

  const handleDeleteMaterial = async (materialId: string, materialName: string) => {
    try {
      await deleteMaterial(materialId);
      toast({
        title: "Material Eliminado",
        description: `El material ${materialName} ha sido eliminado.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el material.",
      });
    }
  };

  const handleArchiveMaterial = async (material: Material) => {
    if (material.stock > 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se puede archivar un material con stock.' });
      return;
    }
    try {
      await updateMaterial(material.id, { archived: true });
      toast({
        title: "Material Archivado",
        description: `El material ${material.name} ha sido archivado.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al Archivar",
        description: error instanceof Error ? error.message : "No se pudo archivar el material.",
      });
    }
  };

  // Categorías con tipo guard explícito
  const categories = useMemo((): string[] => {
    if (!materials || materials.length === 0) return ["all"];
    const allCats: string[] = (materials as Material[])
      .map((m) => m.category)
      .filter((cat): cat is string => typeof cat === "string" && cat.trim().length > 0);
    const uniqueCats = Array.from(new Set(allCats));
    return ["all", ...uniqueCats].sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let filtered: Material[] = materials || [];
    filtered = filtered.filter((m: Material) => showArchived || !m.archived);
    if (searchTerm) {
      filtered = filtered.filter((material: Material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((material: Material) => material.category === categoryFilter);
    }
    return filtered;
  }, [materials, searchTerm, categoryFilter, showArchived]);

  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaterials, currentPage]);

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  const toDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = toDate(date);
    if (!jsDate) return "Fecha no disponible";
    return jsDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const recentReceived = useMemo(() => {
    if (!purchaseRequests) return [];
    return purchaseRequests
      .filter((pr: PurchaseRequest) => pr.status === "received" && pr.receivedAt)
      .sort((a: PurchaseRequest, b: PurchaseRequest) => {
        const dateA = toDate(a.receivedAt)?.getTime() || 0;
        const dateB = toDate(b.receivedAt)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [purchaseRequests]);

  // MaterialMap con tipo explícito para evitar inferencias erróneas
  const materialMap = useMemo((): Map<string, Material> => {
    return new Map<string, Material>((materials || []).map((m: Material) => [m.id, m]));
  }, [materials]);

  const recentApprovedRequests = useMemo(() => {
    if (!requests) return [];
    return (requests as CompatibleMaterialRequest[])
      .filter((r: CompatibleMaterialRequest) => r.status === "approved" && r.createdAt)
      .sort((a: CompatibleMaterialRequest, b: CompatibleMaterialRequest) => {
        const dateA = toDate(a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [requests]);

  const getSupplierNameFromId = (supplierId: string | null | undefined): string => {
    if (!supplierId) return "N/A";
    const supplier = (suppliers || []).find((s: Supplier) => s.id === supplierId);
    return supplier?.name ?? "Desconocido";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Materiales"
        description="Administra el inventario de materiales de la bodega."
      />

      {editingMaterial && canEdit && (
        <EditMaterialForm
          material={editingMaterial}
          isOpen={true}
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
                <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                  <Checkbox id="showArchived" checked={showArchived} onCheckedChange={(checked) => setShowArchived(checked as boolean)} />
                  <Label htmlFor="showArchived" className="text-sm font-medium whitespace-nowrap">Mostrar archivados</Label>
                </div>
              </div>
              <ScrollArea className="h-96 border rounded-md">
                <div className="min-w-full">
                  <Table className="min-w-[800px]">
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
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : paginatedMaterials.length > 0 ? (
                        paginatedMaterials.map((material: Material) => (
                          <TableRow key={material.id} className={material.archived ? "bg-muted/30" : ""}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {material.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {material.category || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {getSupplierNameFromId(material.supplierId)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {material.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {material.stock.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${material.name}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEdit && <DropdownMenuItem onClick={() => setEditingMaterial(material)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Editar</span>
                                  </DropdownMenuItem>}
                                  {canArchive && !material.archived && material.stock === 0 && (
                                    <DropdownMenuItem onClick={() => handleArchiveMaterial(material)}>
                                      <Archive className="mr-2 h-4 w-4" />
                                      <span>Archivar</span>
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar "{material.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se eliminará permanentemente. La acción fallará si el material está en uso en alguna solicitud.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive hover:bg-destructive/90"
                                          onClick={() => handleDeleteMaterial(material.id, material.name)}
                                        >
                                          Sí, eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                <ScrollBar orientation="horizontal" />
                <ScrollBar orientation="vertical" />
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
          {canCreate && (
            <Card>
              <CardHeader>
                <CardTitle>Añadir Nuevo Material</CardTitle>
                <CardDescription>
                  Agrega nuevos tipos de materiales al inventario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateMaterialForm />
              </CardContent>
            </Card>
          )}
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
                    {recentApprovedRequests.map((req: CompatibleMaterialRequest) => {
                      const supervisor = (users || []).find((u: User) => u.id === req.supervisorId);
                      const createdAtDate = formatDate(req.createdAt);
                      return (
                        <li key={`approved-${req.id}`} className="text-sm p-3 rounded-lg border bg-muted/50">
                          <ul className="list-disc list-inside space-y-1">
                            {req.items && Array.isArray(req.items) ? (
                              req.items.map(item => (
                                <li key={item.materialId} className="font-semibold">
                                  {materialMap.get(item.materialId)?.name ?? "N/A"} <span className="font-normal text-primary">({item.quantity} uds)</span>
                                </li>
                              ))
                            ) : (
                              <li key={`${req.id}-${req.materialId}`} className="font-semibold">
                                {materialMap.get(req.materialId || '')?.name ?? "N/A"} <span className="font-normal text-primary">({req.quantity} uds)</span>
                              </li>
                            )}
                          </ul>
                          <p className="text-xs text-muted-foreground mt-1 max-w-full truncate">
                            Para: {req.area} (Solicitado por {supervisor?.name || 'Desconocido'})
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
                    {recentReceived.map((req: PurchaseRequest) => {
                      const supervisor = (users || []).find((u: User) => u.id === req.supervisorId);
                      const receivedAtDate = formatDate(req.receivedAt);
                      return (
                        <li key={`received-${req.id}`} className="text-sm p-3 rounded-lg border bg-muted/50">
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