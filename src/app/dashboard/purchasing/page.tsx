
"use client";
import * as React from "react";
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
import { Timestamp } from "firebase/firestore";

// --- Receive Dialog Component (Copied for local use) ---
interface ReceiveRequestDialogProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    requestId: string,
    quantity: number,
    materialId?: string
  ) => Promise<void>;
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
      const existingMaterial = materials.find(
        (m: Material) => m.name.toLowerCase() === request.materialName.toLowerCase()
      );
      setSelectedMaterialId(existingMaterial?.id);
    }
  }, [request, materials]);

  const handleConfirmClick = async () => {
    if (!request) return;
    const quantityNum = Number(receivedQuantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La cantidad debe ser un número positivo.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(request.id, quantityNum, selectedMaterialId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  const existingMaterial = materials.find(
    (m: Material) => m.name.toLowerCase() === request.materialName.toLowerCase()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Recepción de Material</DialogTitle>
          <DialogDescription>
            Confirma la cantidad de{" "}
            <span className="font-semibold">{request.materialName}</span> que ha
            llegado a bodega.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="receivedQuantity">Cantidad Recibida</Label>
            <Input
              id="receivedQuantity"
              type="number"
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="materialLink">Vincular a Material Existente</Label>
            {existingMaterial ? (
              <div className="p-3 rounded-md bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Material Encontrado
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  El stock se añadirá a:{" "}
                  <strong>{existingMaterial.name}</strong>
                </p>
              </div>
            ) : (
              <Select
                onValueChange={setSelectedMaterialId}
                defaultValue={selectedMaterialId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Crear nuevo material o vincular..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_new">
                    -- Crear Nuevo Material en Bodega --
                  </SelectItem>
                  {materials.map((m: Material) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Si el material ya existe, selecciónalo para sumar el stock. Si no,
              se creará uno nuevo con este nombre.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmClick} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-4 w-4" />
            )}
            Confirmar Recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// --- End of Dialog ---

const StatCardV2 = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) => (
  <div className="flex items-center gap-4 rounded-lg bg-card p-4">
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}
    >
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const PendingReceptionCard = ({
  requests,
  onReceiveClick,
}: {
  requests: PurchaseRequest[];
  onReceiveClick: (request: PurchaseRequest) => void;
}) => {
  const [receptionSearchTerm, setReceptionSearchTerm] = React.useState("");

  const filteredRequests = React.useMemo(() => {
    if (!receptionSearchTerm) return requests;
    return requests.filter((req: PurchaseRequest) =>
      req.materialName.toLowerCase().includes(receptionSearchTerm.toLowerCase())
    );
  }, [requests, receptionSearchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck /> Materiales Pendientes de Recepción
        </CardTitle>
        <CardDescription>
          Listado de materiales aprobados u ordenados que están por llegar a
          bodega.
        </CardDescription>
        <div className="pt-2">
            <Input
              placeholder="Buscar por material..."
              value={receptionSearchTerm}
              onChange={(e) => setReceptionSearchTerm(e.target.value)}
              className="max-w-sm"
            />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req: PurchaseRequest) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <p className="font-medium">{req.materialName}</p>
                      <p className="text-xs text-muted-foreground">{req.area}</p>
                    </TableCell>
                    <TableCell className="font-mono">
                      {req.quantity} {req.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => onReceiveClick(req)}>
                        <PackageCheck className="mr-2 h-4 w-4" />
                        Recibir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay materiales pendientes de recepción.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default function PurchasingHubPage() {
  const {
    purchaseRequests,
    purchaseOrders,
    materials,
    isLoading,
    receivePurchaseRequest,
  } = useAppState();
  const { user } = useAuth();
  const { batchedLots } = useLots();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [receivingRequest, setReceivingRequest] = React.useState<PurchaseRequest | null>(null);

  const stats = React.useMemo(
    () => ({
      pending: (purchaseRequests || []).filter(
        (pr: PurchaseRequest) => pr.status === "pending"
      ).length,
      approved: (purchaseRequests || []).filter(
        (pr: PurchaseRequest) => pr.status === "approved" && !pr.lotId
      ).length,
      lots: (batchedLots || []).length,
      orders: (purchaseOrders || []).length,
    }),
    [purchaseRequests, batchedLots, purchaseOrders]
  );

  const pendingReceptionRequests = React.useMemo(() => {
    return (purchaseRequests || [])
      .filter((pr: PurchaseRequest) => ["approved", "batched", "ordered"].includes(pr.status))
      .sort((a: PurchaseRequest, b: PurchaseRequest) => ((b.approvalDate as any)?.toMillis() || 0) - ((a.approvalDate as any)?.toMillis() || 0));
  }, [purchaseRequests]);

  const categories: string[] = React.useMemo(() => {
    const uniqueCats: string[] = [
      ...new Set((materials || []).map((m: Material) => m.category)),
    ].filter((cat): cat is string => typeof cat === 'string');
    return uniqueCats.sort();
  }, [materials]);

  const filteredMaterials = React.useMemo(() => {
    let filtered: Material[] = (materials || []).filter((m: Material) => !m.archived);
    if (searchTerm) {
      filtered = filtered.filter((material: Material) =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (material: Material) => material.category === categoryFilter
      );
    }
    return filtered;
  }, [materials, searchTerm, categoryFilter]);

  const handleReceiveConfirm = async (
    requestId: string,
    quantity: number,
    existingMaterialId?: string
  ) => {
    try {
      await receivePurchaseRequest(requestId, quantity, existingMaterialId);
      toast({
        title: "Recepción registrada",
        description: "El stock ha sido actualizado.",
      });
      setReceivingRequest(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al recibir",
        description:
          error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      });
    }
  };

  return (
    <>
      <ReceiveRequestDialog
        request={receivingRequest}
        isOpen={!!receivingRequest}
        onClose={() => setReceivingRequest(null)}
        onConfirm={handleReceiveConfirm}
        materials={materials || []}
      />
      <div className="flex flex-col gap-8">
        <PageHeader
          title={`Bienvenido, ${user?.name.split(" ")[0] || ""}`}
          description="Gestiona las solicitudes de compra y supervisa el estado general de la operación."
        />

        {user?.role === "bodega-admin" ? (
          <PendingReceptionCard
            requests={pendingReceptionRequests}
            onReceiveClick={setReceivingRequest}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Estado del Flujo de Compras
              </CardTitle>
              <CardDescription>
                Vista general del ciclo de vida de las solicitudes de compra.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCardV2
                  title="Pendientes"
                  value={stats.pending}
                  icon={ShoppingCart}
                  color="bg-amber-500"
                />
                <StatCardV2
                  title="Aprobadas (sin lote)"
                  value={stats.approved}
                  icon={ThumbsUp}
                  color="bg-green-500"
                />
                <StatCardV2
                  title="En Lote"
                  value={stats.lots}
                  icon={Box}
                  color="bg-purple-500"
                />
                <StatCardV2
                  title="Ordenadas"
                  value={stats.orders}
                  icon={FileText}
                  color="bg-cyan-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse /> Stock Disponible
            </CardTitle>
            <CardDescription>
              Consulta los materiales disponibles en bodega.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Buscar material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar material por nombre"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
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
                      <TableCell colSpan={2} className="h-24 text-center">
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
    </>
  );
}
