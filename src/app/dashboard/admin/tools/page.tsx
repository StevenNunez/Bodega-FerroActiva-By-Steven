
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, User, Wrench, Check, ArrowRight, Undo2, Ban, History, ArrowDown, ArrowUp, ArrowLeftRight, X, Trash2, AlertTriangle, ChevronDown, ScanLine, MoreHorizontal, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GenerateToolForm } from "@/components/admin/generate-tool-form";
import type { User as UserType, Tool as ToolType, PurchaseRequest, MaterialRequest, ToolLog } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "qrcode.react";
import { Timestamp } from "firebase/firestore";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditToolForm } from "@/components/admin/edit-tool-form";

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });

type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

type DailyMovement = {
    id: string;
    type: 'Entrada Material' | 'Salida Material' | 'Salida Herramienta' | 'Entrada Herramienta';
    date: Date;
    description: string;
    user: string;
    log?: ToolLog;
};

const normalizeString = (str: string) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function AdminToolsPage() {
  const { users, toolLogs, tools, checkoutTool, returnTool, requests, materials, purchaseRequests, deleteTool } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<ScanPurpose | null>(null);
  
  const [checkoutState, setCheckoutState] = useState<{worker?: UserType, tools: ToolType[]}>({ tools: [] });
  
  const [isDamaged, setIsDamaged] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  
  const [returnMode, setReturnMode] = useState(false);
  const [manualScanInput, setManualScanInput] = useState('');
  const manualScanInputRef = useRef<HTMLInputElement>(null);

  const [editingTool, setEditingTool] = useState<ToolType | null>(null);


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
  
  const processScan = async (qrCode: string) => {
    // If in return mode, process return
    if (returnMode) {
      await handleReturnScan(qrCode);
      return;
    }

    // If not in return mode, process checkout
    // If no worker is selected, expect a worker QR
    if (!checkoutState.worker) {
      const sanitizedQrCode = qrCode.replace(/['\-]/g, ''); // Remove quotes and hyphens
      const worker = users.find(u => {
          if (!u.qrCode) return false;
          const sanitizedUserQr = u.qrCode.replace(/['\-]/g, '');
          return sanitizedUserQr === sanitizedQrCode && (u.role === 'worker' || u.role === 'supervisor');
      });

      if (worker) {
        setCheckoutState({ worker, tools: [] });
        toast({ title: 'Trabajador Seleccionado', description: `Nombre: ${worker.name}. Ahora escanea las herramientas.` });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Código QR inválido o no corresponde a un trabajador.' });
      }
    } else { // If worker is selected, expect a tool QR
      await handleCheckoutToolScan(qrCode);
    }
  };


  const handleCheckoutToolScan = async (qrCode: string) => {
    const sanitizedQrCode = normalizeString(qrCode).replace(/['\-]/g, '').toUpperCase();
    const tool = tools.find(t => {
        if (!t.qrCode) return false;
        const sanitizedToolQr = normalizeString(t.qrCode).replace(/['\-]/g, '').toUpperCase();
        return sanitizedToolQr === sanitizedQrCode;
    });

    if (!tool) {
        toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no encontrada.' });
        return;
    }
    const isToolCheckedOut = checkedOutTools.some(log => log.toolId === tool.id);
    if (isToolCheckedOut) {
        toast({ variant: 'destructive', title: 'Error', description: `La herramienta "${tool.name}" ya está en uso.` });
        return;
    }
    const isToolInCart = checkoutState.tools.some(t => t.id === tool.id);
    if (isToolInCart) {
        toast({ variant: 'destructive', title: 'Error', description: `La herramienta "${tool.name}" ya está en la lista.` });
        return;
    }
    
    setCheckoutState(prev => ({ ...prev, tools: [...prev.tools, tool] }));
    toast({ title: 'Herramienta Añadida', description: `"${tool.name}" agregada a la lista de entrega.` });
  }
  
  const handleReturnScan = async (qrCode: string) => {
    const sanitizedQrCode = normalizeString(qrCode).replace(/['\-]/g, '').toUpperCase();
    const tool = tools.find(t => {
      if (!t.qrCode) return false;
      const sanitizedToolQr = normalizeString(t.qrCode).replace(/['\-]/g, '').toUpperCase();
      return sanitizedToolQr === sanitizedQrCode;
    });
    
    const logToReturn = tool ? checkedOutTools.find(log => log.toolId === tool.id) : undefined;
    
    if (logToReturn && authUser) {
      await returnTool(logToReturn.id, isDamaged ? 'damaged' : 'ok', returnNotes);
      const returnedTool = tools.find(t => t.id === logToReturn.toolId);
      toast({ title: 'Devolución Registrada', description: `Herramienta ${returnedTool?.name} devuelta.` });
      // Reset return options after each successful return
      setIsDamaged(false);
      setReturnNotes('');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no figura como prestada o el QR es incorrecto.' });
    }
  }

  const handleScanFromDialog = async (qrCode: string) => {
    setScannerOpen(false);
    await processScan(qrCode);
    setScannerPurpose(null);
  };
  
  const handleManualScanSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (manualScanInput.trim()) {
          processScan(manualScanInput.trim());
          setManualScanInput('');
      }
  }

  const handleConfirmCheckout = async () => {
    if (checkoutState.worker && checkoutState.tools.length > 0 && authUser) {
        try {
            const supervisorId = authUser.id; 
            for (const tool of checkoutState.tools) {
                await checkoutTool(tool.id, checkoutState.worker.id, supervisorId);
            }
            toast({ title: 'Entrega Registrada', description: `${checkoutState.tools.length} herramienta(s) entregada(s) a ${checkoutState.worker.name}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la entrega.' });
        }
    }
    handleCancel();
  }
  
  const handleCancel = () => {
    setCheckoutState({ tools: [] });
    setReturnMode(false);
  }

  const onScannerOpenChange = (open: boolean) => {
      setScannerOpen(open);
      if(!open && scannerPurpose) {
          setScannerPurpose(null);
      }
  }
  
  const openScanner = (purpose: ScanPurpose) => {
    setScannerPurpose(purpose);
    setScannerOpen(true);
  }
  
  const removeToolFromCart = (toolId: string) => {
      setCheckoutState(prev => ({
          ...prev,
          tools: prev.tools.filter(t => t.id !== toolId)
      }));
  }

  const scannerTitles: Record<ScanPurpose, string> = {
    'checkout-worker': 'Escanear ID de Trabajador para Entrega',
    'checkout-tool': 'Escanear QR de Herramienta para Entrega',
    'return-tool': 'Escanear QR de Herramienta a Devolver'
  }
  const scannerDescriptions: Record<ScanPurpose, string> = {
    'checkout-worker': 'Apunta la cámara al código QR del carnet del trabajador que recibirá la(s) herramienta(s).',
    'checkout-tool': 'Escanea los códigos QR de todas las herramientas a entregar.',
    'return-tool': 'Escanea el código QR de la herramienta que se está devolviendo para registrar su reingreso.'
  }
  
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
      
      {isScannerOpen && scannerPurpose && (
        <QrScannerDialog 
            open={isScannerOpen} 
            onOpenChange={onScannerOpenChange}
            onScan={handleScanFromDialog}
            title={scannerTitles[scannerPurpose]}
            description={scannerDescriptions[scannerPurpose]}
        />
      )}

      {editingTool && (
        <EditToolForm 
            tool={editingTool}
            isOpen={!!editingTool}
            onClose={() => setEditingTool(null)}
        />
      )}

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
                    <CardTitle className="flex items-center gap-2"><ArrowRightLeft /> Entrega y Devolución</CardTitle>
                    <CardDescription>Usa el escáner de pistola para un proceso rápido o el escáner de cámara como alternativa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                        <Label htmlFor="manual-scan">Escaneo Rápido (Lector de Pistola)</Label>
                        <form onSubmit={handleManualScanSubmit}>
                          <Input
                            ref={manualScanInputRef}
                            id="manual-scan"
                            placeholder={returnMode ? "Escanear herramienta a devolver..." : "Escanear trabajador o herramienta..."}
                            value={manualScanInput}
                            onChange={(e) => setManualScanInput(e.target.value)}
                            />
                        </form>
                        <div className="flex items-center justify-between gap-2">
                           <p className={cn("text-sm font-semibold", returnMode ? 'text-blue-500' : 'text-purple-500')}>
                             MODO: {returnMode ? 'DEVOLUCIÓN' : 'ENTREGA'}
                           </p>
                           <Button variant="outline" size="sm" onClick={() => {
                               setReturnMode(!returnMode);
                               manualScanInputRef.current?.focus();
                           }}>
                               Cambiar a modo {returnMode ? 'Entrega' : 'Devolución'}
                           </Button>
                        </div>
                    </div>


                    {/* Checkout Process */}
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">Proceso de Entrega</h4>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" onClick={handleCancel} disabled={!checkoutState.worker}>
                                        <Trash2 className="h-4 w-4"/>
                                        <span className="sr-only">Cancelar Entrega</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Cancelar Entrega Actual</p></TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                      </div>
                     
                      {!checkoutState.worker ? (
                         <Button className="w-full" onClick={() => openScanner('checkout-worker')}>
                            <User className="mr-2 h-4 w-4"/> Escanear Trabajador (Cámara)
                        </Button>
                      ) : (
                        <div className="space-y-4">
                            <div className="p-3 rounded-md bg-muted text-center">
                                <p className="text-sm text-muted-foreground">Entregando a:</p>
                                <p className="font-semibold">{checkoutState.worker.name}</p>
                            </div>

                            <Button className="w-full" onClick={() => openScanner('checkout-tool')}>
                                <Wrench className="mr-2 h-4 w-4"/> Añadir Herramienta (Cámara)
                            </Button>

                            {checkoutState.tools.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="font-medium text-sm">Herramientas en Carrito ({checkoutState.tools.length}):</h5>
                                    <ScrollArea className="h-32">
                                        <ul className="space-y-1 pr-4">
                                            {checkoutState.tools.map(tool => (
                                                <li key={`cart-${tool.id}`} className="flex items-center justify-between text-sm bg-secondary p-2 rounded-md">
                                                    <span>{tool.name}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeToolFromCart(tool.id)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            )}

                            <Button className="w-full" onClick={handleConfirmCheckout} disabled={checkoutState.tools.length === 0}>
                                <ArrowRight className="mr-2 h-4 w-4"/> Confirmar Entrega ({checkoutState.tools.length})
                            </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Return Process */}
                    <div className="space-y-2 p-4 border rounded-lg">
                       <h4 className="font-semibold text-lg">Proceso de Devolución</h4>
                       <Button className="w-full" onClick={() => openScanner('return-tool')}>
                            <Undo2 className="mr-2 h-4 w-4"/> Registrar Devolución (Cámara)
                       </Button>
                       <Collapsible>
                           <CollapsibleTrigger asChild>
                               <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                                   <ChevronDown className="mr-2 h-4 w-4"/>
                                   Opciones de Devolución (Opcional)
                               </Button>
                           </CollapsibleTrigger>
                           <CollapsibleContent className="space-y-4 pt-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="damaged" checked={isDamaged} onCheckedChange={(checked) => setIsDamaged(checked as boolean)} />
                                    <Label htmlFor="damaged" className="text-destructive font-medium">Herramienta devuelta con daños</Label>
                                </div>
                                <Textarea 
                                    placeholder="Describe el daño o problema de la herramienta..."
                                    value={returnNotes}
                                    onChange={(e) => setReturnNotes(e.target.value)}
                                    disabled={!isDamaged}
                                />
                           </CollapsibleContent>
                       </Collapsible>
                    </div>
                </CardContent>
            </Card>
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
