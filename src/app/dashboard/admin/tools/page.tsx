
"use client";

import React, { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, User, Wrench, Check, ArrowRight, Undo2, Ban, History, ArrowDown, ArrowUp, ArrowLeftRight, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GenerateToolForm } from "@/components/admin/generate-tool-form";
import type { User as UserType, Tool as ToolType, PurchaseRequest, MaterialRequest } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "qrcode.react";
import { Timestamp } from "firebase/firestore";

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });

type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

type DailyMovement = {
    id: string;
    type: 'Entrada Material' | 'Salida Material' | 'Salida Herramienta' | 'Entrada Herramienta';
    date: Date;
    description: string;
    user: string;
};

export default function AdminToolsPage() {
  const { users, toolLogs, tools, checkoutTool, returnTool, requests, materials, purchaseRequests } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<ScanPurpose | null>(null);
  
  const [checkoutState, setCheckoutState] = useState<{worker?: UserType, tools: ToolType[]}>({ tools: [] });
  
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

  const dailyMovements = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (date: Date | Timestamp) => {
        const d = getDate(date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
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
        }));

    const toolReturns: DailyMovement[] = toolLogs
        .filter(log => log.returnDate && isToday(log.returnDate))
        .map(log => ({
            id: `tin-${log.id}`,
            type: 'Entrada Herramienta',
            date: getDate(log.returnDate!),
            description: tools.find(t => t.id === log.toolId)?.name || 'N/A',
            user: users.find(u => u.id === log.workerId)?.name || 'N/A',
        }));
    
    return [...materialEntries, ...materialExits, ...toolCheckouts, ...toolReturns]
        .sort((a,b) => b.date.getTime() - a.date.getTime());
        
  }, [requests, purchaseRequests, materials, users, toolLogs, tools]);
  
  const handleScan = async (qrCode: string) => {
    setScannerOpen(false);

    switch (scannerPurpose) {
      case 'checkout-worker': {
        const worker = users.find(u => u.qrCode === qrCode && u.role === 'worker');
        if (worker) {
          setCheckoutState({ worker, tools: [] });
          toast({ title: 'Trabajador Seleccionado', description: `Nombre: ${worker.name}. Ahora escanea las herramientas.` });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Código QR inválido o no corresponde a un trabajador.' });
        }
        break;
      }
      case 'checkout-tool': {
        const tool = tools.find(t => t.qrCode === qrCode);
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
        break;
      }
      case 'return-tool': {
        const tool = tools.find(t => t.qrCode === qrCode);
        const logToReturn = tool ? checkedOutTools.find(log => log.toolId === tool.id) : undefined;
        
        if (logToReturn && authUser) {
          await returnTool(logToReturn.id);
          const returnedTool = tools.find(t => t.id === logToReturn.toolId);
          toast({ title: 'Devolución Registrada', description: `Herramienta ${returnedTool?.name} devuelta.` });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no figura como prestada o el QR es incorrecto.' });
        }
        break;
      }
    }
     setScannerPurpose(null);
  };

  const handleConfirmCheckout = async () => {
    if (checkoutState.worker && checkoutState.tools.length > 0 && authUser) {
        try {
            for (const tool of checkoutState.tools) {
                await checkoutTool(tool.id, checkoutState.worker.id, authUser.id);
            }
            toast({ title: 'Entrega Registrada', description: `${checkoutState.tools.length} herramienta(s) entregada(s) a ${checkoutState.worker.name}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la entrega.' });
        }
    }
    handleCancel();
  }
  
  const handleCancel = () => {
    setScannerOpen(false);
    setScannerPurpose(null);
    setCheckoutState({ tools: [] });
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
    'checkout-worker': 'Escanear QR de Trabajador para Entrega',
    'checkout-tool': 'Escanear QR de Herramienta para Entrega',
    'return-tool': 'Escanear QR de Herramienta a Devolver'
  }
  const scannerDescriptions: Record<ScanPurpose, string> = {
    'checkout-worker': 'Apunta la cámara al código QR del trabajador que recibirá la(s) herramienta(s).',
    'checkout-tool': 'Escanea los códigos QR de todas las herramientas a entregar.',
    'return-tool': 'Escanea el código QR de la herramienta que se está devolviendo para registrar su reingreso.'
  }
  
  const getMovementBadge = (type: DailyMovement['type']) => {
    switch (type) {
        case 'Entrada Material':
            return <Badge className="bg-blue-600 text-white"><ArrowDown className="mr-1 h-3 w-3" />Ingreso Mat.</Badge>;
        case 'Salida Material':
            return <Badge className="bg-orange-600 text-white"><ArrowUp className="mr-1 h-3 w-3" />Salida Mat.</Badge>;
        case 'Entrada Herramienta':
            return <Badge className="bg-green-600 text-white"><Undo2 className="mr-1 h-3 w-3" />Devolución Herr.</Badge>;
        case 'Salida Herramienta':
            return <Badge className="bg-purple-600 text-white"><ArrowRight className="mr-1 h-3 w-3" />Entrega Herr.</Badge>;
        default:
            return <Badge variant="secondary">{type}</Badge>;
    }
  }


  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gestión de Herramientas" description="Administra el inventario y el ciclo de vida de las herramientas." />
      
      {isScannerOpen && scannerPurpose && (
        <QrScannerDialog 
            open={isScannerOpen} 
            onOpenChange={onScannerOpenChange}
            onScan={handleScan}
            title={scannerTitles[scannerPurpose]}
            description={scannerDescriptions[scannerPurpose]}
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
                                    <TableHead className="text-right">En posesión de</TableHead>
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
                                            <TableCell className="text-right text-muted-foreground">
                                                {checkoutInfo.workerName || '---'}
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
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
                                    <TableHead>Hora</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {dailyMovements.length > 0 ? (
                                dailyMovements.map(log => (
                                   <TableRow key={log.id}>
                                       <TableCell>{getMovementBadge(log.type)}</TableCell>
                                       <TableCell className="font-medium">{log.description}</TableCell>
                                       <TableCell>{log.user}</TableCell>
                                       <TableCell>{log.date.toLocaleTimeString()}</TableCell>
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
                    <CardDescription>Usa los escáneres para registrar la entrada y salida de herramientas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Checkout Process */}
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg">Proceso de Entrega</h4>
                        <Button variant="ghost" size="icon" onClick={handleCancel} disabled={!checkoutState.worker}>
                            <Trash2 className="h-4 w-4"/>
                            <span className="sr-only">Cancelar Entrega</span>
                        </Button>
                      </div>
                     
                      {!checkoutState.worker ? (
                         <Button className="w-full" onClick={() => openScanner('checkout-worker')}>
                            <User className="mr-2 h-4 w-4"/> Escanear Trabajador
                        </Button>
                      ) : (
                        <div className="space-y-4">
                            <div className="p-3 rounded-md bg-muted text-center">
                                <p className="text-sm text-muted-foreground">Entregando a:</p>
                                <p className="font-semibold">{checkoutState.worker.name}</p>
                            </div>

                            <Button className="w-full" onClick={() => openScanner('checkout-tool')}>
                                <Wrench className="mr-2 h-4 w-4"/> Añadir Herramienta
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
                            <Undo2 className="mr-2 h-4 w-4"/> Registrar Devolución
                       </Button>
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