"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import { useLots } from "@/hooks/use-lots";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, PackageMinus, FolderPlus, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/modules/core/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateLotForm } from "@/components/operations/create-lot-form";
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
import type { PurchaseRequest } from "@/modules/core/lib/data";

// Tipos
interface Request extends PurchaseRequest {}

interface Lot {
  lotId: string;
  category: string;
  requests: Request[];
  totalQuantity: number;
}

// Componente para el estado vacío
const EmptyState = memo(({ message, description }: { message: string; description: string }) => (
  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
    <Inbox className="h-16 w-16 mb-4" aria-hidden="true" />
    <h3 className="text-xl font-semibold">{message}</h3>
    <p className="mt-2 text-sm">{description}</p>
  </div>
));

// Componente para solicitudes aprobadas
const ApprovedRequestsCard = memo(
  ({
    approvedRequests,
    batchedLots,
    handleAddBack,
  }: {
    approvedRequests: Request[];
    batchedLots: Lot[];
    handleAddBack: (requestId: string, lotId: string) => Promise<void>;
  }) => (
    <Card className="transition-all duration-300">
      <CardHeader>
        <CardTitle>Solicitudes Aprobadas (Sin Lote)</CardTitle>
        <CardDescription>
          Aquí están todas las solicitudes aprobadas que esperan ser agrupadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {approvedRequests.length > 0 ? (
          <ScrollArea className="h-[calc(80vh-15rem)]">
            <div className="space-y-3 pr-4">
              {approvedRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 border rounded-lg flex items-center justify-between gap-2 bg-muted/30"
                  role="listitem"
                >
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">
                      {req.materialName} ({req.quantity} {req.unit})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.category} / Para: {req.area}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-48">
                        <Select
                        onValueChange={(lotId) => handleAddBack(req.id, lotId)}
                        disabled={batchedLots.length === 0}
                        aria-label={`Asignar solicitud ${req.materialName} a un lote`}
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Asignar a Lote..." />
                        </SelectTrigger>
                        <SelectContent>
                            {batchedLots.length > 0 ? (
                            batchedLots.map((lot) => (
                                <SelectItem key={lot.lotId} value={lot.lotId}>
                                {lot.category}
                                </SelectItem>
                            ))
                            ) : (
                            <SelectItem disabled value="none">
                                No hay lotes disponibles
                            </SelectItem>
                            )}
                        </SelectContent>
                        </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <EmptyState
            message="No hay solicitudes para agrupar"
            description="Cuando se aprueben nuevas solicitudes, aparecerán aquí."
          />
        )}
      </CardContent>
    </Card>
  )
);

// Componente para crear un nuevo lote
const CreateLotCard = memo(() => (
  <Card className="transition-all duration-300">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FolderPlus /> Crear Nuevo Lote Manual
      </CardTitle>
      <CardDescription>Crea un lote personalizado por nombre o proveedor.</CardDescription>
    </CardHeader>
    <CardContent>
      <CreateLotForm />
    </CardContent>
  </Card>
));

// Componente para lotes activos
const ActiveLotsCard = memo(
  ({
    batchedLots,
    handleRemove,
    handleArchiveRequest,
  }: {
    batchedLots: Lot[];
    handleRemove: (requestId: string) => Promise<void>;
    handleArchiveRequest: (requestId: string) => Promise<void>;
  }) => (
    <Card className="transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Lotes de Compra Activos</CardTitle>
        <CardDescription>
          Estos lotes están listos. Ve a "Órdenes de Compra" para generar los documentos, o ajústalos aquí.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[65vh]">
          {batchedLots.length > 0 ? (
            batchedLots.map((lot) => (
              <div key={lot.lotId} className="p-4 border rounded-lg bg-muted/30 mb-4 relative" role="listitem">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-lg text-primary capitalize">{lot.category}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                        {lot.requests.length} solicitudes, {lot.totalQuantity.toLocaleString()} unidades en total.
                        </p>
                    </div>
                 </div>
                {lot.requests.length > 0 ? (
                  <div className="space-y-2">
                    {lot.requests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between bg-card p-2 rounded-md"
                        role="listitem"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {req.materialName} ({req.quantity} {req.unit})
                          </p>
                          <p className="text-xs text-muted-foreground">Para: {req.area}</p>
                        </div>
                         <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={() => handleArchiveRequest(req.id)} aria-label={`Archivar solicitud para ${req.materialName}`}>
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(req.id)} aria-label={`Quitar solicitud ${req.materialName} del lote`} >
                                <PackageMinus className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-muted-foreground italic py-4">
                    Lote vacío. Asigna solicitudes aprobadas a este lote.
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              message="No hay lotes activos"
              description="Crea lotes desde las solicitudes aprobadas o manualmente."
            />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
);

// Componente principal
export default function LotsPage() {
  const { approvedRequests, batchedLots } = useLots();
  const { removeRequestFromLot, addRequestToLot, updatePurchaseRequestStatus } = useAppState();
  const { toast } = useToast();
  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null);

  // Handlers optimizados con useCallback
  const handleRemove = useCallback(
    async (requestId: string) => {
      if (!requestId) {
        toast({ variant: "destructive", title: "Error", description: "ID de solicitud no válido" });
        return;
      }
      setIsLoadingAction(requestId);
      try {
        await removeRequestFromLot(requestId);
        toast({ title: "Solicitud movida", description: "Volvió a las aprobadas." });
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: e?.message || "Error inesperado al mover la solicitud",
        });
      } finally {
        setIsLoadingAction(null);
      }
    },
    [removeRequestFromLot, toast]
  );

  const handleAddBack = useCallback(
    async (requestId: string, lotId: string) => {
      if (!requestId || !lotId) {
        toast({ variant: "destructive", title: "Error", description: "ID de solicitud o lote no válido" });
        return;
      }
      setIsLoadingAction(requestId);
      try {
        await addRequestToLot(requestId, lotId);
        toast({ title: "Solicitud re-agrupada", description: "Asignada al lote." });
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: e?.message || "Error inesperado al asignar la solicitud",
        });
      } finally {
        setIsLoadingAction(null);
      }
    },
    [addRequestToLot, toast]
  );
  
  const handleArchiveRequest = useCallback(async (requestId: string) => {
      try {
        await updatePurchaseRequestStatus(requestId, "ordered", { notes: "Archivada manualmente desde panel de lotes." });
        toast({ title: 'Solicitud Archivada', description: 'La solicitud se ha limpiado de la lista de pendientes sin afectar el stock.' });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error al archivar", description: error.message || "No se pudo archivar la solicitud." });
      }
  }, [updatePurchaseRequestStatus, toast]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Lotes de Compra"
        description="Agrupa las solicitudes aprobadas en lotes y ajústalos antes de generar las órdenes de compra."
      />
      <div className="grid grid-cols-1 gap-8 items-start">
        <ApprovedRequestsCard
          approvedRequests={approvedRequests}
          batchedLots={batchedLots}
          handleAddBack={handleAddBack}
        />
        <CreateLotCard />
        <ActiveLotsCard
            batchedLots={batchedLots}
            handleRemove={handleRemove}
            handleArchiveRequest={handleArchiveRequest}
        />
      </div>
    </div>
  );
}
