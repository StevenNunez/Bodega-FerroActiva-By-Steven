"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/modules/core/hooks/use-toast";
import { PurchaseRequest, PurchaseRequestStatus, Material, User } from "@/modules/core/lib/data";
import {
  Check,
  Clock,
  X,
  PackageCheck,
  Loader2,
  Box,
  FileText,
  Edit,
  AlertCircle,
  Search,
  User as UserIcon,
  ChevronsUpDown,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EditPurchaseRequestForm } from "@/components/operations/edit-purchase-request-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ReceiveRequestDialogProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, quantity: number, materialId?: string) => Promise<void>;
  materials: Material[];
}

function ReceiveRequestDialog({ request, isOpen, onClose, onConfirm, materials }: ReceiveRequestDialogProps) {
  const [receivedQuantity, setReceivedQuantity] = useState<number | string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (request) {
      setReceivedQuantity(request.quantity);
      setSelectedMaterialId(undefined); // Reset on new request
    } else {
      setReceivedQuantity("");
      setSelectedMaterialId(undefined);
    }
  }, [request]);

  const handleConfirmClick = async () => {
    if (!request) return;
    const quantityNum = Number(receivedQuantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ variant: "destructive", title: "Error", description: "La cantidad debe ser un número positivo." });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(request.id, quantityNum, selectedMaterialId);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const unarchivedMaterials = useMemo(() => materials.filter(m => !m.archived), [materials]);

  if (!request) return null;
  
  const selectedMaterialName = selectedMaterialId
      ? materials.find(m => m.id === selectedMaterialId)?.name
      : "Asignar a material existente...";


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onInteractOutside={(e) => { e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Registrar Recepción de Material</DialogTitle>
          <DialogDescription>
            Confirma la cantidad de <span className="font-semibold">{String(request.materialName ?? "")}</span> que ha llegado a bodega.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="received-quantity">Cantidad Recibida Real</Label>
            <Input
              id="received-quantity"
              type="number"
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value)}
              placeholder="Ingresa la cantidad que llegó..."
            />
            <p className="text-xs text-muted-foreground">
              Puedes ajustar la cantidad si es diferente a la aprobada ({request.quantity}).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Asignar a Material Existente (Opcional)</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  <span className="truncate">{selectedMaterialName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar material..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron materiales.</CommandEmpty>
                    <CommandGroup>
                      {unarchivedMaterials.map((material) => (
                        <CommandItem
                          key={material.id}
                          value={material.name}
                          onSelect={() => {
                            setSelectedMaterialId(material.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedMaterialId === material.id ? "opacity-100" : "opacity-0")} />
                          {material.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Si este material ya existe (ej. es un duplicado), selecciónalo aquí para sumar el stock en lugar de crear uno nuevo.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleConfirmClick} disabled={isSubmitting || !receivedQuantity}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
            Confirmar Recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPurchaseRequestsPage() {
  const { purchaseRequests, users, receivePurchaseRequest, isLoading, materials } = useAppState();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseRequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [applicantFilter, setApplicantFilter] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [receivingRequest, setReceivingRequest] = useState<PurchaseRequest | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = getDate(date);
    if (!jsDate) return "N/A";
    return jsDate.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const supervisorMap = useMemo(
    () => new Map((users || []).map((u: User) => [u.id, u.name])),
    [users]
  );

  const filteredRequests = useMemo(() => {
    let requests = (purchaseRequests || []);
    if (statusFilter !== "all") {
      requests = requests.filter((req: PurchaseRequest) => req.status === statusFilter);
    }
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        requests = requests.filter((req: PurchaseRequest) => {
            const name = String(req.materialName ?? "");
            return name.toLowerCase().includes(lowercasedTerm);
        });
    }
    if (applicantFilter) {
        const lowercasedTerm = applicantFilter.toLowerCase();
        requests = requests.filter((req: PurchaseRequest) => {
            const supervisorName = String(supervisorMap.get(req.supervisorId) ?? '');
            return supervisorName.toLowerCase().includes(lowercasedTerm);
        });
    }
    return requests;
  }, [purchaseRequests, statusFilter, searchTerm, applicantFilter, supervisorMap]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const handleReceive = async (id: string, quantity: number, existingMaterialId?: string) => {
    try {
      await receivePurchaseRequest(id, quantity, existingMaterialId);
      setReceivingRequest(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el stock.",
      });
    }
  };

  const getStatusBadge = useMemo(
    () => (status: PurchaseRequestStatus) => {
      switch (status) {
        case "pending":
          return (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <Clock className="mr-1 h-3 w-3" />
              Pendiente
            </Badge>
          );
        case "approved":
          return (
            <Badge variant="default" className="bg-green-600 text-white">
              <Check className="mr-1 h-3 w-3" />
              Aprobado
            </Badge>
          );
        case "rejected":
          return (
            <Badge variant="destructive">
              <X className="mr-1 h-3 w-3" />
              Rechazado
            </Badge>
          );
        case "received":
          return (
            <Badge variant="default" className="bg-blue-600 text-white">
              <PackageCheck className="mr-1 h-3 w-3" />
              Recibido
            </Badge>
          );
        case "batched":
          return (
            <Badge variant="default" className="bg-purple-600 text-white">
              <Box className="mr-1 h-3 w-3" />
              En Lote
            </Badge>
          );
        case "ordered":
          return (
            <Badge variant="default" className="bg-cyan-600 text-white">
              <FileText className="mr-1 h-3 w-3" />
              Orden Generada
            </Badge>
          );
        default:
          return <Badge variant="outline">Desconocido</Badge>;
      }
    },
    []
  );

  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
      return `Cantidad original: ${req.originalQuantity}. ${
        req.notes || "Sin notas adicionales."
      }`;
    }
    if (req.notes) {
      return req.notes;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      {editingRequest && (
        <EditPurchaseRequestForm
          request={editingRequest}
          isOpen={true}
          onClose={() => setEditingRequest(null)}
        />
      )}

      <ReceiveRequestDialog
        request={receivingRequest}
        isOpen={!!receivingRequest}
        onClose={() => setReceivingRequest(null)}
        onConfirm={handleReceive}
        materials={materials}
      />

      <PageHeader
        title="Visualización de Solicitudes de Compra"
        description="Aquí puedes ver el estado de todas las solicitudes y gestionar el ingreso de materiales aprobados."
      />

      <Card className="!max-w-none">
        <CardHeader>
          <CardTitle>Historial de Solicitudes de Compra</CardTitle>
          <CardDescription>
            Puedes revisar, gestionar y registrar el ingreso de materiales a
            bodega.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <Label htmlFor="search-material">Buscar por material</Label>
                   <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search-material"
                            type="search"
                            placeholder="Nombre del material..."
                            className="pl-8 sm:w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                 <div className="flex-grow">
                  <Label htmlFor="applicant-filter">Filtrar por solicitante</Label>
                   <div className="relative">
                        <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="applicant-filter"
                            type="search"
                            placeholder="Nombre del solicitante..."
                            className="pl-8 sm:w-full"
                            value={applicantFilter}
                            onChange={(e) => setApplicantFilter(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full sm:w-[180px]">
                  <Label htmlFor="status-filter">Filtrar por estado</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as "all" | PurchaseRequestStatus);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger
                      id="status-filter"
                      aria-describedby="status-filter-description"
                    >
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                      <SelectItem value="received">Recibido</SelectItem>
                      <SelectItem value="batched">En Lote</SelectItem>
                      <SelectItem value="ordered">Orden Generada</SelectItem>
                    </SelectContent>
                  </Select>
                  <span id="status-filter-description" className="sr-only">
                    Filtra solicitudes de compra por estado
                  </span>
                </div>
            </div>

            <div className="relative w-full overflow-x-auto">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="min-w-[250px]">Material</TableHead>
                      <TableHead className="min-w-[120px]">Cantidad</TableHead>
                      <TableHead className="min-w-[300px]">
                        Justificación
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        Solicitante
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        Fecha Solicitud
                      </TableHead>
                       <TableHead className="min-w-[150px]">
                        Fecha Recepción
                      </TableHead>
                      <TableHead className="min-w-[150px]">Estado</TableHead>
                      <TableHead className="min-w-[180px] text-right">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length > 0 ? (
                      paginatedRequests.map((req: PurchaseRequest) => {
                        const supervisor = String(supervisorMap.get(req.supervisorId) ?? "N/A");
                        const changeTooltip = getChangeTooltip(req);
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium min-w-[250px] whitespace-pre-wrap break-words">
                              {String(req.materialName ?? "")}
                            </TableCell>

                            <TableCell className="flex items-center gap-2 min-w-[120px]">
                              {req.quantity} {req.unit}
                              {changeTooltip && (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </TableCell>

                            <TableCell className="min-w-[300px] whitespace-pre-wrap break-words">
                              {String(req.justification ?? "N/A")}
                            </TableCell>

                            <TableCell className="min-w-[150px]">
                              {supervisor}
                            </TableCell>
                            <TableCell className="min-w-[150px]">
                              {formatDate(req.createdAt)}
                            </TableCell>
                             <TableCell className="min-w-[150px]">
                              {req.receivedAt ? formatDate(req.receivedAt) : "N/A"}
                            </TableCell>
                            <TableCell className="min-w-[150px]">
                              {getStatusBadge(req.status)}
                            </TableCell>
                            <TableCell className="text-right min-w-[180px]">
                              {req.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRequest(req)}
                                  aria-label={`Gestionar solicitud de compra para ${String(req.materialName ?? "")}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Gestionar
                                </Button>
                              )}
                              {["approved", "batched", "ordered"].includes(
                                req.status
                              ) && (
                                <Button
                                  size="sm"
                                  onClick={() => setReceivingRequest(req)}
                                  aria-label={`Recibir solicitud de compra ${String(req.materialName ?? "")}`}
                                >
                                  <PackageCheck className="mr-2 h-4 w-4" />
                                  Recibir
                                </Button>
                              )}
                              {req.status === "received" && (
                                <span className="text-xs text-green-500">
                                  Ingresado
                                </span>
                              )}
                              {req.status === "rejected" && (
                                <span className="text-xs text-red-500">
                                  Rechazada
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No hay solicitudes de compra para los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  aria-label="Página anterior de solicitudes"
                >
                  Anterior
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  aria-label="Página siguiente de solicitudes"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
