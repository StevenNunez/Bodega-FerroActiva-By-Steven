"use client";

import React, { useState, useMemo } from 'react';
import { useAppState, useAuth } from '@/modules/core/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Check,
  X,
  PackageCheck,
  Box,
  FileText,
  Edit,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/modules/core/hooks/use-toast';
import { EditPurchaseRequestForm } from '@/components/operations/edit-purchase-request-form';
import type { PurchaseRequest, PurchaseRequestStatus, Material, User } from '@/modules/core/lib/data';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ReceiveRequestDialogProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestId: string, quantity: number, materialId?: string) => Promise<void>;
  materials: Material[];
}

function ReceiveRequestDialog({ request, isOpen, onClose, onConfirm, materials }: ReceiveRequestDialogProps) {
  const [receivedQuantity, setReceivedQuantity] = useState<number | string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (request) {
      setReceivedQuantity(request.quantity);
      setSelectedMaterialId(undefined);
    }
  }, [request]);

  const handleConfirmClick = async () => {
    if (!request) return;
    const quantityNum = Number(receivedQuantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'La cantidad debe ser un número positivo.' });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Recepción de Material</DialogTitle>
          <DialogDescription>
            Confirma la cantidad de <span className="font-semibold">{request.materialName}</span> que ha llegado a bodega.
          </DialogDescription>
        </DialogHeader>
        {/* El contenido del formulario de recepción se ha omitido por brevedad en este ejemplo */}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirmClick} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
            Confirmar Recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


const STATUS_CONFIG: Record<PurchaseRequestStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-yellow-500' },
  approved: { label: 'Aprobado', icon: Check, color: 'bg-green-600' },
  rejected: { label: 'Rechazado', icon: X, color: 'bg-red-600' },
  ordered: { label: 'Orden Generada', icon: FileText, color: 'bg-cyan-600' },
  batched: { label: 'En Lote', icon: Box, color: 'bg-purple-600' },
  received: { label: 'Recibido', icon: PackageCheck, color: 'bg-blue-600' },
};


export default function PurchaseRequestsPage() {
  const { purchaseRequests, users, materials, receivePurchaseRequest, isLoading } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [receivingRequest, setReceivingRequest] = useState<PurchaseRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseRequestStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const supervisorMap = useMemo(() => new Map<string, string>((users || []).map((u: User) => [u.id, u.name])), [users]);

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : new Date(date);
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    const jsDate = getDate(date);
    return jsDate ? jsDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
  };

  const sortedPurchaseRequests = useMemo(() => {
    return [...(purchaseRequests || [])].sort((a: PurchaseRequest, b: PurchaseRequest) => {
      const dateA = a.createdAt ? getDate(a.createdAt)?.getTime() || 0 : 0;
      const dateB = b.createdAt ? getDate(b.createdAt)?.getTime() || 0 : 0;
      return dateB - dateA;
    });
  }, [purchaseRequests]);
  
  const filteredRequests = useMemo(() => {
      let filtered = sortedPurchaseRequests;
      if (statusFilter !== "all") {
        filtered = filtered.filter((r: PurchaseRequest) => r.status === statusFilter);
      }
      if (searchTerm) {
        filtered = filtered.filter((req: PurchaseRequest) => 
            req.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (supervisorMap.get(req.supervisorId) || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return filtered;
    }, [sortedPurchaseRequests, statusFilter, searchTerm, supervisorMap]);

    const paginatedRequests = useMemo(() => {
      return filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [filteredRequests, page]);

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);


  const getStatusBadge = (status: PurchaseRequestStatus) => {
    const config = STATUS_CONFIG[status] || { label: 'Desconocido', icon: Package, color: 'bg-gray-500' };
    return (
      <Badge variant="secondary" className={`${config.color} text-white`}>
        <config.icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };
  
    const handleReceiveConfirm = async (requestId: string, quantity: number, existingMaterialId?: string) => {
    try {
      await receivePurchaseRequest(requestId, quantity, existingMaterialId);
      toast({ title: "Recepción registrada", description: "El stock ha sido actualizado." });
      setReceivingRequest(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al recibir",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      });
    }
  };
  
  const getChangeTooltip = (req: PurchaseRequest) => {
    if (req.originalQuantity && req.originalQuantity !== req.quantity) {
      return `Cantidad original: ${req.originalQuantity}. ${req.notes || 'Sin notas adicionales.'}`;
    }
    return req.notes || null;
  };


  return (
    <>
      {editingRequest && (
        <EditPurchaseRequestForm
          request={editingRequest}
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}
      <ReceiveRequestDialog
        request={receivingRequest}
        isOpen={!!receivingRequest}
        onClose={() => setReceivingRequest(null)}
        onConfirm={handleReceiveConfirm}
        materials={materials || []}
      />
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Gestión de Solicitudes de Compra"
          description="Aprueba, rechaza y gestiona el ciclo de vida de las solicitudes de compra."
        />
        <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow">
                      <Label htmlFor="search-material">Buscar por material o solicitante</Label>
                      <Input
                          id="search-material"
                          type="search"
                          placeholder="Buscar..."
                          className="w-full sm:w-[300px]"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Label htmlFor="status-filter">Filtrar por estado</Label>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                        setStatusFilter(value as 'all' | PurchaseRequestStatus);
                        setPage(1);
                        }}
                    >
                        <SelectTrigger id="status-filter" aria-label="Filtrar solicitudes por estado">
                        <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {Object.keys(STATUS_CONFIG).map((status) => (
                            <SelectItem key={status} value={status}>
                            {STATUS_CONFIG[status as PurchaseRequestStatus].label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="border rounded-md">
                <div className="min-w-[1200px]">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[250px]">Material</TableHead>
                            <TableHead className="min-w-[120px]">Cantidad</TableHead>
                            <TableHead className="min-w-[300px]">Justificación</TableHead>
                            <TableHead className="min-w-[150px]">Solicitante</TableHead>
                            <TableHead className="min-w-[150px]">Fecha</TableHead>
                            <TableHead className="min-w-[150px]">Estado</TableHead>
                            <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : paginatedRequests.length > 0 ? (
                            paginatedRequests.map((req: PurchaseRequest) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium min-w-[250px] whitespace-pre-wrap break-words">{req.materialName}</TableCell>
                                 <TableCell className="flex items-center gap-2 min-w-[120px]">
                                  {req.quantity} {req.unit}
                                  {getChangeTooltip(req) && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs">{getChangeTooltip(req)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                                <TableCell className="min-w-[300px] whitespace-pre-wrap break-words">{req.justification}</TableCell>
                                <TableCell className="min-w-[150px]">{supervisorMap.get(req.supervisorId) ?? 'N/A'}</TableCell>
                                <TableCell className="min-w-[150px]">{formatDate(req.createdAt)}</TableCell>
                                <TableCell className="min-w-[150px]">{getStatusBadge(req.status)}</TableCell>
                                <TableCell className="text-right min-w-[180px] space-x-2">
                                  {(req.status === 'pending' || req.status === 'approved' || req.status === 'batched' || req.status === 'ordered') && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingRequest(req)}>
                                      <Edit className="mr-2 h-4 w-4" /> Gestionar
                                    </Button>
                                  )}
                                   {(req.status === 'approved' || req.status === 'ordered' || req.status === 'batched') && (
                                    <Button size="sm" onClick={() => setReceivingRequest(req)}>
                                      <PackageCheck className="mr-2 h-4 w-4" /> Recibir
                                    </Button>
                                  )}
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No hay solicitudes que coincidan con los filtros.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
             {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span>Página {page} de {totalPages}</span>
                <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
