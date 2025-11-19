"use client";

import React from "react";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import {
  ShoppingCart,
  ThumbsUp,
  Box,
  FileText,
  Warehouse,
  Truck,
  PackageCheck,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useLots } from "@/hooks/use-lots";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Material, PurchaseRequest } from "@/modules/core/lib/data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/modules/core/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Timestamp } from "firebase/firestore"; // ← Import agregado

interface ReceiveRequestDialogProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, quantity: number, materialId?: string) => Promise<void>;
  materials: Material[];
}

function ReceiveRequestDialog({
  request,
  isOpen,
  onClose,
  onConfirm,
  materials,
}: ReceiveRequestDialogProps) {
  const [receivedQuantity, setReceivedQuantity] = React.useState<number | string>("");
  const [selectedMaterialId, setSelectedMaterialId] = React.useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (request) {
      setReceivedQuantity(request.quantity);
      const existing = materials.find(
        (m) => m.name.toLowerCase() === request.materialName.toLowerCase()
      );
      setSelectedMaterialId(existing?.id);
    }
  }, [request, materials]);

  const handleConfirm = async () => {
    if (!request) return;
    const qty = Number(receivedQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Cantidad inválida" });
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(request.id, qty, selectedMaterialId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recibir Material</DialogTitle>
          <DialogDescription>
            Confirma la cantidad de <strong>{request.materialName}</strong> recibida.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cantidad Recibida</Label>
            <Input type="number" value={receivedQuantity} onChange={(e) => setReceivedQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vincular a Material Existente (Opcional)</Label>
            <Select onValueChange={setSelectedMaterialId} value={selectedMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar o crear nuevo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create_new">-- Crear Nuevo --</SelectItem>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.stock} en stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
            Confirmar Recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const StatCardV2 = ({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color?: string }) => (
  <div className={`flex items-center gap-4 rounded-lg bg-card p-4 border`}>
    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color || "bg-primary/10"} text-primary`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export default function PurchasingHubPage() {
  const { user, can } = useAuth();
  const {
    purchaseRequests,
    purchaseOrders,
    materials,
    isLoading,
    receivePurchaseRequest,
  } = useAppState();
  const { batchedLots } = useLots();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [receivingRequest, setReceivingRequest] = React.useState<PurchaseRequest | null>(null);

  // === ESTADÍSTICAS CON TIPADO EXPLÍCITO ===
  const stats = React.useMemo(() => ({
    pending: (purchaseRequests || []).filter((pr: PurchaseRequest) => pr.status === "pending").length,
    approved: (purchaseRequests || []).filter((pr: PurchaseRequest) => pr.status === "approved" && !pr.lotId).length,
    inLots: batchedLots?.length || 0,
    ordered: purchaseOrders?.length || 0,
  }), [purchaseRequests, batchedLots, purchaseOrders]);

  // === PENDIENTES DE RECEPCIÓN (solo para bodega-admin) ===
  const pendingReception = React.useMemo(() => {
    return (purchaseRequests || [])
      .filter((pr: PurchaseRequest) => ["approved", "batched", "ordered"].includes(pr.status))
      .sort((a: PurchaseRequest, b: PurchaseRequest) => {
        const aTime = a.approvalDate instanceof Timestamp ? a.approvalDate.toMillis() : 0;
        const bTime = b.approvalDate instanceof Timestamp ? b.approvalDate.toMillis() : 0;
        return bTime - aTime;
      });
  }, [purchaseRequests]);

  // === CATEGORÍAS Y STOCK FILTRADO ===
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    materials?.forEach((m: Material) => m.category && set.add(m.category));
    return Array.from(set).sort();
  }, [materials]);

  const filteredStock = React.useMemo(() => {
    let list = (materials || []).filter((m: Material) => !m.archived);
    if (searchTerm) {
      list = list.filter((m: Material) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      list = list.filter((m: Material) => m.category === categoryFilter);
    }
    return list;
  }, [materials, searchTerm, categoryFilter]);

  const handleReceive = async (id: string, qty: number, matId?: string) => {
    try {
      await receivePurchaseRequest(id, qty, matId);
      toast({ title: "Recepción Exitosa", description: "Stock actualizado" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "No se pudo recibir" });
    }
  };

  const canReceive = can("stock:receive_order");

  return (
    <>
      {canReceive && (
        <ReceiveRequestDialog
          request={receivingRequest}
          isOpen={!!receivingRequest}
          onClose={() => setReceivingRequest(null)}
          onConfirm={handleReceive}
          materials={materials || []}
        />
      )}

      <div className="flex flex-col gap-8">
        <PageHeader
          title={`Bienvenido, ${user?.name.split(" ")[0] || "Usuario"}`}
          description="Módulo de Compras - Supervisa todo el flujo de adquisiciones"
        />

        {/* Jefe de Bodega: ve recepción */}
        {user?.role === "bodega-admin" && canReceive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" /> Pendientes de Recepción
              </CardTitle>
              <CardDescription>Materiales aprobados/ordenados por recibir</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReception.length > 0 ? pendingReception.map((req: PurchaseRequest) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.materialName}</TableCell>
                        <TableCell>{req.quantity} {req.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{req.area}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => setReceivingRequest(req)}>
                            <PackageCheck className="mr-2 h-4 w-4" /> Recibir
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          No hay materiales pendientes de recepción
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Todos los demás roles: estadísticas */}
        {(user?.role !== "bodega-admin" || !canReceive) && (
          <Card>
            <CardHeader>
              <CardTitle>Estado General de Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCardV2 title="Pendientes" value={stats.pending} icon={ShoppingCart} color="bg-amber-500" />
                <StatCardV2 title="Aprobadas sin lote" value={stats.approved} icon={ThumbsUp} color="bg-green-500" />
                <StatCardV2 title="En Lotes" value={stats.inLots} icon={Box} color="bg-purple-500" />
                <StatCardV2 title="Ordenadas" value={stats.ordered} icon={FileText} color="bg-cyan-500" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" /> Stock Actual en Bodega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Buscar material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-96 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Cargando...</TableCell></TableRow>
                  ) : filteredStock.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No hay materiales</TableCell></TableRow>
                  ) : (
                    filteredStock.map((mat: Material) => (
                      <TableRow key={mat.id}>
                        <TableCell className="font-medium">{mat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{mat.category}</TableCell>
                        <TableCell className="text-right font-mono">{mat.stock.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}