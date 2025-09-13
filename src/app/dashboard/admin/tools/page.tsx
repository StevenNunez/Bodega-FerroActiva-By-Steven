"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Undo2, History, ArrowDown, ArrowUp, X, Trash2, AlertTriangle, MoreHorizontal, Edit, CalendarIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GenerateToolForm } from "@/components/admin/generate-tool-form";
import type { Tool as ToolType, PurchaseRequest, MaterialRequest, ToolLog } from "@/lib/data";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Timestamp } from "firebase/firestore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditToolForm } from "@/components/admin/edit-tool-form";
import { ToolCheckoutCard } from "@/components/admin/tool-checkout-card";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type DailyMovement = {
  id: string;
  type: "Entrada Material" | "Salida Material" | "Salida Herramienta" | "Entrada Herramienta";
  date: Date;
  description: string;
  user: string;
  log?: ToolLog;
};

export default function AdminToolsPage() {
  const { users, toolLogs, tools, deleteTool, requests, materials, purchaseRequests, isLoading } = useAppState();
  const [editingTool, setEditingTool] = useState<ToolType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [toolStatusFilter, setToolStatusFilter] = useState<"all" | "Disponible" | "Ocupado">("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"all" | DailyMovement["type"]>("all");
  const [toolPage, setToolPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const itemsPerPage = 5;
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const checkedOutTools = useMemo(() => toolLogs.filter((log) => log.returnDate === null), [toolLogs]);

  const getToolCheckoutInfo = useMemo(() => {
    const workerMap = new Map(users.map((u) => [u.id, u.name]));
    return (toolId: string) => {
      const log = checkedOutTools.find((log) => log.toolId === toolId);
      if (!log) return { status: "Disponible" as const, workerName: null };
      return { status: "Ocupado" as const, workerName: workerMap.get(log.workerId) ?? "Desconocido" };
    };
  }, [checkedOutTools, users]);

  const getDate = (date: Date | Timestamp | null | undefined): Date | null => {
    if (!date) return null;
    return date instanceof Timestamp ? date.toDate() : date;
  };

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    if (!date) return "N/A";
    const jsDate = getDate(date);
    if (!jsDate) return "N/A";
    return jsDate.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTools = useMemo(() => {
    if (toolStatusFilter === "all") return tools;
    return tools.filter((tool) => getToolCheckoutInfo(tool.id).status === toolStatusFilter);
  }, [tools, toolStatusFilter, getToolCheckoutInfo]);

  const paginatedTools = filteredTools.slice((toolPage - 1) * itemsPerPage, toolPage * itemsPerPage);
  const totalToolPages = Math.ceil(filteredTools.length / itemsPerPage);

  const historicalMovements = useMemo((): DailyMovement[] => {
    if (!selectedDate) return [];

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);

    const isSameDay = (date: Date | Timestamp | null | undefined) => {
      const d = getDate(date);
      if (!d) return false;
      const dCopy = new Date(d);
      dCopy.setHours(0, 0, 0, 0);
      return dCopy.getTime() === targetDate.getTime();
    };

    const materialEntries: DailyMovement[] = purchaseRequests
      .filter((pr: PurchaseRequest) => pr.status === "received" && pr.receivedAt && isSameDay(pr.receivedAt))
      .map((pr: PurchaseRequest) => ({
        id: `pr-${pr.id}`,
        type: "Entrada Material" as const,
        date: getDate(pr.receivedAt)!,
        description: `${pr.materialName} (${pr.quantity} uds)`,
        user: users.find((u) => u.id === pr.supervisorId)?.name ?? "N/A",
      }));

    const materialExits: DailyMovement[] = requests
      .filter((r: MaterialRequest) => r.status === "approved" && isSameDay(r.createdAt))
      .map((r: MaterialRequest) => ({
        id: `req-${r.id}`,
        type: "Salida Material" as const,
        date: getDate(r.createdAt)!,
        description: `${materials.find((m) => m.id === r.materialId)?.name ?? "N/A"} (${r.quantity} uds)`,
        user: users.find((u) => u.id === r.supervisorId)?.name ?? "N/A",
      }));

    const toolCheckouts: DailyMovement[] = toolLogs
      .filter((log) => isSameDay(log.checkoutDate))
      .map((log) => ({
        id: `tout-${log.id}`,
        type: "Salida Herramienta" as const,
        date: getDate(log.checkoutDate)!,
        description: tools.find((t) => t.id === log.toolId)?.name ?? "N/A",
        user: users.find((u) => u.id === log.workerId)?.name ?? "N/A",
        log,
      }));

    const toolReturns: DailyMovement[] = toolLogs
      .filter((log) => log.returnDate && isSameDay(log.returnDate))
      .map((log) => ({
        id: `tin-${log.id}`,
        type: "Entrada Herramienta" as const,
        date: getDate(log.returnDate)!,
        description: tools.find((t) => t.id === log.toolId)?.name ?? "N/A",
        user: users.find((u) => u.id === log.workerId)?.name ?? "N/A",
        log,
      }));

    let movements = [...materialEntries, ...materialExits, ...toolCheckouts, ...toolReturns];
    if (movementTypeFilter !== "all") {
      movements = movements.filter((m) => m.type === movementTypeFilter);
    }
    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [requests, purchaseRequests, materials, users, toolLogs, tools, selectedDate, movementTypeFilter]);

  const paginatedMovements = historicalMovements.slice(
    (movementPage - 1) * itemsPerPage,
    movementPage * itemsPerPage
  );
  const totalMovementPages = Math.ceil(historicalMovements.length / itemsPerPage);

  const getMovementBadge = (log: DailyMovement) => {
    switch (log.type) {
      case "Entrada Material":
        return (
          <Badge className="bg-blue-600 text-white">
            <ArrowDown className="mr-1 h-3 w-3" />
            Ingreso Mat.
          </Badge>
        );
      case "Salida Material":
        return (
          <Badge className="bg-orange-600 text-white">
            <ArrowUp className="mr-1 h-3 w-3" />
            Salida Mat.
          </Badge>
        );
      case "Entrada Herramienta":
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white">
              <Undo2 className="mr-1 h-3 w-3" />
              Devolución Herr.
            </Badge>
            {log.log?.returnCondition === "damaged" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{log.log?.returnNotes || "Devuelto con daños."}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      case "Salida Herramienta":
        return (
          <Badge className="bg-purple-600 text-white">
            <ArrowRight className="mr-1 h-3 w-3" />
            Entrega Herr.
          </Badge>
        );
      default:
        return <Badge variant="secondary">{log.type}</Badge>;
    }
  };

  const handleDeleteTool = async (toolId: string, toolName: string) => {
    try {
      await deleteTool(toolId);
      toast({
        title: "Herramienta Eliminada",
        description: `La herramienta ${toolName} ha sido eliminada correctamente.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la herramienta.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gestión de Herramientas" description="Administra el inventario y el ciclo de vida de las herramientas." />

      {editingTool && (
        <EditToolForm tool={editingTool} isOpen={!!editingTool} onClose={() => setEditingTool(null)} />
      )}

      <ToolCheckoutCard />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="!max-w-none">
            <CardHeader>
              <CardTitle>Inventario de Herramientas</CardTitle>
              <CardDescription>Lista completa de todas las herramientas y su estado actual.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                <div className="w-[180px]">
                  <Label htmlFor="tool-status-filter">Filtrar por estado</Label>
                  <Select
                    value={toolStatusFilter}
                    onValueChange={(value) => {
                      setToolStatusFilter(value as "all" | "Disponible" | "Ocupado");
                      setToolPage(1);
                    }}
                  >
                    <SelectTrigger id="tool-status-filter" aria-describedby="tool-status-filter-description">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Ocupado">Ocupado</SelectItem>
                    </SelectContent>
                  </Select>
                  <span id="tool-status-filter-description" className="sr-only">
                    Filtra herramientas por estado de disponibilidad
                  </span>
                </div>
                <div className="relative overflow-x-auto max-w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-[200px]">Nombre</TableHead>
                          <TableHead className="w-[100px]">Código QR</TableHead>
                          <TableHead className="w-[150px]">Estado</TableHead>
                          <TableHead className="w-[200px]">En posesión de</TableHead>
                          <TableHead className="w-[150px] text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTools.length > 0 ? (
                          paginatedTools.map((tool) => {
                            const checkoutInfo = getToolCheckoutInfo(tool.id);
                            return (
                              <TableRow key={tool.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">{tool.name}</TableCell>
                                <TableCell>
                                  <div className="p-1 bg-white rounded-md w-fit">
                                    <QRCodeSVG value={tool.qrCode} size={40} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={checkoutInfo.status === "Disponible" ? "default" : "destructive"}
                                    className={cn(
                                      checkoutInfo.status === "Disponible" ? "bg-green-600" : "bg-orange-600",
                                      "text-white"
                                    )}
                                  >
                                    {checkoutInfo.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {checkoutInfo.workerName ?? "---"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Abrir menú para ${tool.name}`}>
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setEditingTool(tool)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Editar</span>
                                      </DropdownMenuItem>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            disabled={checkoutInfo.status !== "Disponible"}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                            <span className="text-destructive">Eliminar</span>
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro de eliminar {tool.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Se eliminará permanentemente la herramienta de la base de datos.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive hover:bg-destructive/90"
                                              onClick={() => handleDeleteTool(tool.id, tool.name)}
                                            >
                                              Sí, eliminar herramienta
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              No se encontraron herramientas.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalToolPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      disabled={toolPage === 1}
                      onClick={() => setToolPage((prev) => prev - 1)}
                      aria-label="Página anterior de herramientas"
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {toolPage} de {totalToolPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={toolPage === totalToolPages}
                      onClick={() => setToolPage((prev) => prev + 1)}
                      aria-label="Página siguiente de herramientas"
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History /> Movimientos de Bodega
                  </CardTitle>
                  <CardDescription>Registro de todas las entradas y salidas de materiales y herramientas.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-[180px]">
                    <Label htmlFor="movement-type-filter">Filtrar por tipo</Label>
                    <Select
                      value={movementTypeFilter}
                      onValueChange={(value) => {
                        setMovementTypeFilter(value as "all" | DailyMovement["type"]);
                        setMovementPage(1);
                      }}
                    >
                      <SelectTrigger id="movement-type-filter" aria-describedby="movement-type-filter-description">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Entrada Material">Entrada Material</SelectItem>
                        <SelectItem value="Salida Material">Salida Material</SelectItem>
                        <SelectItem value="Salida Herramienta">Salida Herramienta</SelectItem>
                        <SelectItem value="Entrada Herramienta">Entrada Herramienta</SelectItem>
                      </SelectContent>
                    </Select>
                    <span id="movement-type-filter-description" className="sr-only">
                      Filtra movimientos por tipo
                    </span>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-[280px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                        aria-label="Seleccionar fecha para movimientos"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? selectedDate.toLocaleDateString("es-CL") : <span>Selecciona una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                <div className="relative overflow-x-auto max-w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-[150px]">Tipo</TableHead>
                          <TableHead className="w-[250px]">Descripción</TableHead>
                          <TableHead className="w-[200px]">Responsable/Trabajador</TableHead>
                          <TableHead className="w-[200px]">Fecha y Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovements.length > 0 ? (
                          paginatedMovements.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{getMovementBadge(log)}</TableCell>
                              <TableCell className="font-medium max-w-[250px] truncate">{log.description}</TableCell>
                              <TableCell>{log.user}</TableCell>
                              <TableCell className="font-mono text-xs">{formatDate(log.date)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              No hay movimientos registrados para la fecha seleccionada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalMovementPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      disabled={movementPage === 1}
                      onClick={() => setMovementPage((prev) => prev - 1)}
                      aria-label="Página anterior de movimientos"
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {movementPage} de {totalMovementPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={movementPage === totalMovementPages}
                      onClick={() => setMovementPage((prev) => prev + 1)}
                      aria-label="Página siguiente de movimientos"
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Añadir Nueva Herramienta</CardTitle>
              <CardDescription>Agrega una nueva herramienta al inventario.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateToolForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}