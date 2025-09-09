
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Undo2, History, ArrowDown, ArrowUp, X, Trash2, AlertTriangle, MoreHorizontal, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GenerateToolForm } from "@/components/admin/generate-tool-form";
import type { Tool as ToolType, PurchaseRequest, MaterialRequest, ToolLog } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "qrcode.react";
import { Timestamp } from "firebase/firestore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditToolForm } from "@/components/admin/edit-tool-form";
import { ToolCheckoutCard } from "@/components/admin/tool-checkout-card";
import { useToast } from "@/hooks/use-toast";


type DailyMovement = {
    id: string;
    type: 'Entrada Material' | 'Salida Material' | 'Salida Herramienta' | 'Entrada Herramienta';
    date: Date;
    description: string;
    user: string;
    log?: ToolLog;
};

export default function AdminToolsPage() {
  const { users, toolLogs, tools, deleteTool, requests, materials, purchaseRequests } = useAppState();
  const [editingTool, setEditingTool] = useState<ToolType | null>(null);
  const { toast } = useToast();

  const checkedOutTools = useMemo(() => toolLogs.filter(log => log.returnDate === null), [toolLogs]);

  const getToolCheckoutInfo = (toolId: string) => {
    const log = checkedOutTools.find(log => log.toolId === toolId);
    if (!log) return { status: "Disponible" };
    const worker = users.find(u => u.id === log.workerId);
    return { status: "Ocupado", workerName: worker?.name || "Desconocido" };
  };

  const getDate = (date: Date | Timestamp) => {
      return date instanceof Timestamp ? date.toDate() : date;
  }

  const dailyMovements = useMemo((): DailyMovement[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (date: Date | Timestamp) => {
        const d = getDate(date);
        const dCopy = new Date(d.getTime());
        dCopy.setHours(0,0,0,0);
        return dCopy.getTime() === today.getTime();
    }

    const materialEntries: DailyMovement[] = purchaseRequests
        .filter((pr: PurchaseRequest) => pr.status === 'received' && pr.receivedAt && isToday(pr.receivedAt))
        .map((pr: PurchaseRequest) => ({
            id: `pr-${pr.id}`,
            type: 'Entrada Material',
            date: getDate(pr.receivedAt!),
            description: `${pr.materialName} (${pr.quantity} uds)`,
            user: users.find(u => u.id === pr.supervisorId)?.name || 'N/A',
        }));

    const materialExits: DailyMovement[] = requests
        .filter((r: MaterialRequest) => r.status === 'approved' && isToday(r.createdAt))
        .map((r: MaterialRequest) => ({
            id: `req-${r.id}`,
            type: 'Salida Material',
            date: getDate(r.createdAt),
            description: `${materials.find(m => m.id === r.materialId)?.name || 'N/A'} (${r.quantity} uds)`,
            user: users.find(u => u.id === r.supervisorId)?.name || 'N/A',
        }));

    const toolCheckouts: DailyMovement[] = toolLogs
        .filter(log => isToday(log.checkoutDate))
        .map(log => ({
            id: `tout-${log.id}`,
            type: 'Salida Herramienta',
            date: getDate(log.checkoutDate),
            description: tools.find(t => t.id === log.toolId)?.name || 'N/A',
            user: users.find(u => u.id === log.workerId)?.name || 'N/A',
            log,
        }));

    const toolReturns: DailyMovement[] = toolLogs
        .filter(log => log.returnDate && isToday(log.returnDate))
        .map(log => ({
            id: `tin-${log.id}`,
            type: 'Entrada Herramienta',
            date: getDate(log.returnDate!),
            description: tools.find(t => t.id === log.toolId)?.name || 'NA',
            user: users.find(u => u.id === log.workerId)?.name || 'N/A',
            log,
        }));
    
    return [...materialEntries, ...materialExits, ...toolCheckouts, ...toolReturns]
        .sort((a,b) => b.date.getTime() - a.date.getTime());
        
  }, [requests, purchaseRequests, materials, users, toolLogs, tools]);
  
  
  const getMovementBadge = (log: DailyMovement) => {
    switch (log.type) {
        case 'Entrada Material':
            return <Badge className="bg-blue-600 text-white"><ArrowDown className="mr-1 h-3 w-3" />Ingreso Mat.</Badge>;
        case 'Salida Material':
            return <Badge className="bg-orange-600 text-white"><ArrowUp className="mr-1 h-3 w-3" />Salida Mat.</Badge>;
        case 'Entrada Herramienta':
            return (
                <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-white"><Undo2 className="mr-1 h-3 w-3" />Devolución Herr.</Badge>
                    {log.log?.returnCondition === 'damaged' && 
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">{log.log?.returnNotes || 'Devuelto con daños.'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    }
                </div>
            );
        case 'Salida Herramienta':
            return <Badge className="bg-purple-600 text-white"><ArrowRight className="mr-1 h-3 w-3" />Entrega Herr.</Badge>;
        default:
            return <Badge variant="secondary">{log.type}</Badge>;
    }
  }

  const handleDeleteTool = async (toolId: string, toolName: string) => {
        try {
            await deleteTool(toolId);
            toast({
                title: "Herramienta Eliminada",
                description: `La herramienta ${toolName} ha sido eliminada correctamente.`
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error?.message || "No se pudo eliminar la herramienta."
            });
        }
    }


  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gestión de Herramientas" description="Administra el inventario y el ciclo de vida de las herramientas." />

      {editingTool && (
        <EditToolForm 
            tool={editingTool}
            isOpen={!!editingTool}
            onClose={() => setEditingTool(null)}
        />
      )}
      
      <ToolCheckoutCard />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Inventario de Herramientas</CardTitle>
                    <CardDescription>Lista completa de todas las herramientas y su estado actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Código QR</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>En posesión de</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tools.length > 0 ? (
                                    tools.map(tool => {
                                        const checkoutInfo = getToolCheckoutInfo(tool.id);
                                        return (
                                        <TableRow key={tool.id}>
                                            <TableCell className="font-medium">{tool.name}</TableCell>
                                            <TableCell>
                                                <div className="p-1 bg-white rounded-md w-fit">
                                                    <QRCodeSVG value={tool.qrCode} size={40} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={checkoutInfo.status === 'Disponible' ? 'default' : 'destructive'} 
                                                    className={cn(checkoutInfo.status === 'Disponible' ? 'bg-green-600' : 'bg-orange-600', 'text-white')}
                                                >
                                                    {checkoutInfo.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {checkoutInfo.workerName || '---'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingTool(tool)}>
                                                            <Edit className="mr-2 h-4 w-4"/>
                                                            <span>Editar</span>
                                                        </DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={checkoutInfo.status !== 'Disponible'}>
                                                                    <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                                                    <span className="text-destructive">Eliminar</span>
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Estás seguro de eliminar {tool.name}?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Esta acción no se puede deshacer. Se eliminará permanentemente la herramienta
                                                                        de la base de datos.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                        onClick={() => handleDeleteTool(tool.id, tool.name)}>
                                                                        Sí, eliminar herramienta
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No se encontraron herramientas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Movimientos de Bodega del Día</CardTitle>
                    <CardDescription>Registro de todas las entradas y salidas de materiales y herramientas de la jornada.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Responsable/Trabajador</TableHead>
                                    <TableHead>Fecha y Hora</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {dailyMovements.length > 0 ? (
                                dailyMovements.map(log => (
                                   <TableRow key={log.id}>
                                       <TableCell>{getMovementBadge(log)}</TableCell>
                                       <TableCell className="font-medium">{log.description}</TableCell>
                                       <TableCell>{log.user}</TableCell>
                                       <TableCell className="font-mono text-xs">{log.date.toLocaleString()}</TableCell>
                                   </TableRow>
                                ))) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay movimientos registrados hoy.
                                    </TableCell>
                                </TableRow>
                               )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
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
