
"use client";

import React from "react";
import { useLots } from "@/hooks/use-lots";
import { useAppState } from "@/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, PackageMinus, PackagePlus, Check, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateLotForm } from "@/components/operations/create-lot-form";

export default function OperationsLotsPage() {
  const { approvedRequests, batchedLots } = useLots();
  const { batchApprovedRequests, removeRequestFromLot, addRequestToLot } = useAppState();
  const { toast } = useToast();

  // ----- Handlers -----
  const handleBatchByCategory = async () => {
    try {
      await batchApprovedRequests(approvedRequests.map((r) => r.id), { mode: "category" });
      toast({ title: "Lotes creados", description: "Agrupados por categoría." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Error inesperado" });
    }
  };

  const handleBatchBySupplier = async () => {
    try {
      await batchApprovedRequests(approvedRequests.map((r) => r.id), { mode: "supplier" });
      toast({ title: "Lotes creados", description: "Agrupados por proveedor." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Error inesperado" });
    }
  };

  const handleRemove = async (requestId: string) => {
    try {
      await removeRequestFromLot(requestId);
      toast({ title: "Solicitud movida", description: "Volvió a las aprobadas." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Error inesperado" });
    }
  };

  const handleAddBack = async (requestId: string, lotId: string) => {
    if (!lotId) return;
    try {
      await addRequestToLot(requestId, lotId);
      toast({ title: "Solicitud re-agrupada", description: "Asignada al lote." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Error inesperado" });
    }
  };

  // ----- UI -----
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gestión de Lotes de Compra"
        description="Agrupa las solicitudes aprobadas en lotes y ajústalos antes de generar las órdenes de compra."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Solicitudes aprobadas */}
        <Card>
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
                    <div key={req.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                      <div className="flex-grow">
                        <p className="font-semibold text-sm">
                          {req.materialName} ({req.quantity} {req.unit})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.category} / Para: {req.area}
                        </p>
                      </div>
                      <div className="w-48">
                        <Select onValueChange={(lotId) => handleAddBack(req.id, lotId)} disabled={batchedLots.length === 0}>
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
                              <SelectItem disabled value="none">No hay lotes disponibles</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                <Inbox className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">No hay solicitudes para agrupar</h3>
                <p className="mt-2">Cuando se aprueben nuevas solicitudes, aparecerán aquí.</p>
              </div>
            )}

            {/* Botón crear lotes */}
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={approvedRequests.length === 0}>
                    <PackagePlus className="mr-2" /> Crear Lotes Automáticos
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cómo quieres crear los lotes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Puedes agrupar las solicitudes aprobadas por <b>categoría</b> o por <b>proveedor</b>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <Button onClick={handleBatchByCategory} className="w-full">Por Categoría</Button>
                    <Button onClick={handleBatchBySupplier} className="w-full">Por Proveedor</Button>
                    <AlertDialogCancel className="w-full">Cancelar</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Lado derecho */}
        <div className="space-y-8">
          {/* Crear manual */}
          <Card>
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

          {/* Lotes activos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check /> Lotes de Compra Activos
              </CardTitle>
              <CardDescription>
                Estos lotes están listos. Ve a "Órdenes de Compra" para generar los documentos, o ajústalos aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[65vh]">
                {batchedLots.length > 0 ? (
                  batchedLots.map((lot) => (
                    <div key={lot.lotId} className="p-4 border rounded-lg bg-muted/30 mb-4">
                      <h3 className="font-semibold text-lg text-primary capitalize">{lot.category}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {lot.requests.length} solicitudes, {lot.totalQuantity.toLocaleString()} unidades en total.
                      </p>
                      <div className="space-y-2">
                        {lot.requests.map((req) => (
                          <div key={req.id} className="flex items-center justify-between bg-card p-2 rounded-md">
                            <div>
                              <p className="font-medium text-sm">
                                {req.materialName} ({req.quantity} {req.unit})
                              </p>
                              <p className="text-xs text-muted-foreground">Para: {req.area}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemove(req.id)}
                            >
                              <PackageMinus className="mr-2 h-4 w-4" /> Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                    <Inbox className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">No hay lotes activos</h3>
                    <p className="mt-2">Crea lotes desde las solicitudes aprobadas o manualmente.</p>
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
