
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
  Search,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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
import { Material, PurchaseRequest, User } from "@/modules/core/lib/data";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const PendingReceptionCard = ({ requests, onReceiveClick, users }: {
  requests: PurchaseRequest[];
  onReceiveClick: (request: PurchaseRequest) => void;
  users: User[];
}) => {
  const [materialSearch, setMaterialSearch] = React.useState("");
  const [applicantSearch, setApplicantSearch] = React.useState("");

  const supervisorMap = React.useMemo(() => new Map((users || []).map((u: User) => [u.id, u.name])), [users]);

  const filteredRequests = React.useMemo(() => {
    return requests.filter(req => {
        const materialMatch = materialSearch ? req.materialName.toLowerCase().includes(materialSearch.toLowerCase()) : true;
        const applicant = supervisorMap.get(req.supervisorId) || '';
        const applicantMatch = applicantSearch ? applicant.toLowerCase().includes(applicantSearch.toLowerCase()) : true;
        return materialMatch && applicantMatch;
    });
  }, [requests, materialSearch, applicantSearch, supervisorMap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Truck className="h-8 w-8 text-primary" />
          Recepción de Materiales Pendientes
          <Badge variant="secondary" className="ml-auto text-lg px-3">
            {requests.length} por recibir
          </Badge>
        </CardTitle>
        <CardDescription className="text-base">
          Materiales aprobados y en camino a bodega.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por material..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por solicitante..."
              value={applicantSearch}
              onChange={(e) => setApplicantSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <ScrollArea className="h-96 rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Material</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{req.materialName}</p>
                        <p className="text-xs text-muted-foreground">{req.area}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-base">
                        {req.quantity} {req.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supervisorMap.get(req.supervisorId) || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => onReceiveClick(req)}
                      >
                        <PackageCheck className="mr-2 h-4 w-4" />
                        Recibir
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                      <p className="text-lg">¡Todo al día! No hay recepciones pendientes.</p>
                    </div>
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
    users,
    can,
  } = useAppState();
  const { user } = useAuth();
  const { batchedLots } = useLots();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [receivingRequest, setReceivingRequest] = React.useState<PurchaseRequest | null>(null);

  const canReceive = can('stock:receive_order');

  const stats = React.useMemo(
    () => ({
      pending: (purchaseRequests || []).filter(
        (pr: PurchaseRequest) => pr.status === "pending"
      ).length,
      approved: (purchaseRequests || []).filter(
        (pr: PurchaseRequest) => pr.status === "approved" && !pr.lotId
      ).length,
      inLots: batchedLots.length,
      ordered: (purchaseOrders || []).length,
    }),
    [purchaseRequests, batchedLots, purchaseOrders]
  );

  const pendingReceptionRequests = React.useMemo(() => {
    return (purchaseRequests || [])
      .filter((pr: PurchaseRequest) => ["approved", "batched", "ordered"].includes(pr.status))
      .sort((a: any, b: any) => (b.approvalDate?.toMillis() || 0) - (a.approvalDate?.toMillis() || 0));
  }, [purchaseRequests]);

  const categories = React.useMemo(() => {
    if (!materials) return [];
    const allCats: (string | undefined)[] = materials.map((m: Material) => m.category);
    const uniqueCats: string[] = [...new Set(allCats.filter((cat): cat is string => !!cat))];
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
      {canReceive && (
        <ReceiveRequestDialog
          request={receivingRequest}
          isOpen={!!receivingRequest}
          onClose={() => setReceivingRequest(null)}
          onConfirm={handleReceiveConfirm}
          materials={materials || []}
        />
      )}

      <div className="flex flex-col gap-10">
      
      <PageHeader
        title={`Bienvenido, ${user?.name.split(" ")[0] || ""}`}
        description="Gestiona las solicitudes de compra y supervisa el estado general de la operación."
      />
      
        {user?.role === "bodega-admin" ? (
          <PendingReceptionCard
            requests={pendingReceptionRequests}
            onReceiveClick={setReceivingRequest}
            users={users || []}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Estado del Flujo de Compras</CardTitle>
              <CardDescription>
                Vista general del ciclo de vida de las solicitudes de compra.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">

                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-yellow-600/20 flex items-center justify-center">
                    <ShoppingCart className="h-7 w-7 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Pendientes</p>
                    <p className="text-2xl font-semibold">{stats.pending}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-green-600/20 flex items-center justify-center">
                    <ThumbsUp className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Aprobadas (sin lote)</p>
                    <p className="text-2xl font-semibold">{stats.approved}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-purple-600/20 flex items-center justify-center">
                    <Box className="h-7 w-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">En Lote</p>
                    <p className="text-2xl font-semibold">{stats.inLots}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-cyan-600/20 flex items-center justify-center">
                    <FileText className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Ordenadas</p>
                    <p className="text-2xl font-semibold">{stats.ordered}</p>
                  </div>
                </div>

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
