'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, User, ArrowRight, X, ScanLine } from 'lucide-react';
import type { User as UserType, Tool as ToolType } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '../ui/input';

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });
type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

const sanitizeQrCode = (code: string): string => {
  if (!code) return "";
  const upperCode = code.trim().toUpperCase();

  if (upperCode.startsWith('USER-')) {
    // User IDs might have mixed case and other symbols from Firebase, only replace ' if needed
     return code.trim().replace(/'/g, "-");
  }

  if (upperCode.startsWith('TOOL-')) {
    // Replicate the exact normalization logic from addTool in app-provider
    const parts = code.trim().split('-');
    if (parts.length > 2) {
      const namePart = parts.slice(1, -1).join('-');
      const idPart = parts[parts.length - 1];
      const normalizedName = namePart
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      return `TOOL-${normalizedName}-${idPart}`;
    }
  }
  
  return code.trim();
};


export function ToolCheckoutCard() {
  const { users, tools, checkoutTool, returnTool, user: authUser, findActiveLogForTool } = useAppState();
  const { toast } = useToast();

  const [checkoutState, setCheckoutState] = useState<{ worker?: UserType; tools: ToolType[] }>({ tools: [] });
  const [returnMode, setReturnMode] = useState(false);
  const [manualWorkerId, setManualWorkerId] = useState('');
  const [manualToolId, setManualToolId] = useState('');
  const [pistolInput, setPistolInput] = useState('');
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<ScanPurpose | null>(null);
  const [isDamaged, setIsDamaged] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  
  const checkoutStateRef = useRef(checkoutState);
  useEffect(() => {
    checkoutStateRef.current = checkoutState;
  }, [checkoutState]);

  const { workers, checkedOutTools, availableTools } = useMemo(() => {
    const activeWorkers = users.filter(u => u.role !== 'guardia');
    const logs = findActiveLogForTool ? [] : []; // Dependency to re-evaluate if function changes
    const checkedOutToolIds = new Set(logs.filter(log => log.returnDate === null).map(log => log.toolId));
    
    return {
      workers: activeWorkers,
      checkedOutTools: tools.filter(tool => checkedOutToolIds.has(tool.id)),
      availableTools: tools.filter(tool => !checkedOutToolIds.has(tool.id)),
    };
  }, [users, tools, findActiveLogForTool]);
  
  const handleCancel = useCallback(() => {
    setCheckoutState({ tools: [] });
    setManualWorkerId('');
    setManualToolId('');
    setIsDamaged(false);
    setReturnNotes('');
  }, []);
  
  const handleToolToCheckout = useCallback((tool: ToolType) => {
    if (checkoutStateRef.current.tools.some(t => t.id === tool.id)) {
      toast({ variant: 'destructive', title: 'Error', description: `"${tool.name}" ya está en la lista.` });
      return;
    }
    const isAvailable = !checkedOutTools.some(t => t.id === tool.id);
    if (!isAvailable) {
        toast({ variant: 'destructive', title: 'Error', description: `"${tool.name}" no está disponible.` });
        return;
    }
    setCheckoutState(prev => ({ ...prev, tools: [...prev.tools, tool] }));
  }, [checkedOutTools, toast]);
  
  const handleReturn = useCallback(async (tool: ToolType) => {
    const activeLog = await findActiveLogForTool(tool.id);
    if (!activeLog) {
      toast({ variant: 'destructive', title: 'Error', description: 'Esta herramienta no figura como prestada activamente.' });
      return;
    }
    if (authUser) {
      await returnTool(activeLog.id, isDamaged ? 'damaged' : 'ok', returnNotes);
      toast({ title: 'Devolución Registrada', description: `Herramienta "${tool.name}" devuelta.` });
      handleCancel();
    }
  }, [isDamaged, returnNotes, authUser, returnTool, toast, handleCancel, findActiveLogForTool]);

  const processScan = useCallback((scannedCode: string) => {
    const finalCode = sanitizeQrCode(scannedCode.trim());

    if (finalCode.startsWith('USER-')) {
        const worker = users.find(u => u.qrCode === finalCode);
        if (worker) {
            setCheckoutState({ worker, tools: [] });
            toast({ title: 'Trabajador Seleccionado', description: `Listo para entregar a: ${worker.name}.` });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Código de usuario no encontrado: ${finalCode}` });
        }
    } else if (finalCode.startsWith('TOOL-')) {
        const tool = tools.find(t => t.qrCode === finalCode);
        if (!tool) {
            toast({ variant: 'destructive', title: 'Error', description: `Código de herramienta no encontrado: ${finalCode}` });
            return;
        }

        if (returnMode) {
            handleReturn(tool);
        } else {
            if (!checkoutStateRef.current.worker) {
                toast({ variant: 'destructive', title: 'Error', description: 'Escanea primero el QR de un trabajador.' });
                return;
            }
            handleToolToCheckout(tool);
        }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Entrada no reconocida.' });
    }
  }, [users, tools, returnMode, handleReturn, handleToolToCheckout, toast]);

  const handlePistolScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = pistolInput.trim();
    if (code) {
      processScan(code);
    }
    setPistolInput('');
  };

  const handleManualWorkerSelect = (workerId: string) => {
    const worker = users.find(u => u.id === workerId);
    if (worker) {
      setCheckoutState({ worker, tools: [] });
      setManualWorkerId(workerId);
    }
  };

  const handleManualToolSelect = () => {
    const toolToAdd = availableTools.find(t => t.id === manualToolId);
    if (toolToAdd) {
        handleToolToCheckout(toolToAdd);
    }
    setManualToolId('');
  };
  
  const handleManualReturn = async () => {
      const toolToReturn = tools.find(t => t.id === manualToolId);
      if (toolToReturn) {
        await handleReturn(toolToReturn);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no encontrada.' });
      }
      setManualToolId('');
  };

  const handleConfirmCheckout = async () => {
    if (checkoutState.worker && checkoutState.tools.length > 0 && authUser) {
      try {
        const supervisorId = authUser.id;
        for (const tool of checkoutState.tools) {
          await checkoutTool(tool.id, checkoutState.worker.id, supervisorId);
        }
        toast({ title: 'Entrega Registrada', description: `${checkoutState.tools.length} herramienta(s) entregada(s) a ${checkoutState.worker.name}.` });
        handleCancel();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la entrega.' });
      }
    }
  };

  const removeToolFromCart = (toolId: string) => {
    setCheckoutState(prev => ({ ...prev, tools: prev.tools.filter(t => t.id !== toolId) }));
  };
  
  const openScanner = (purpose: ScanPurpose) => {
    setScannerPurpose(purpose);
    setScannerOpen(true);
  };
  
  const handleScanFromDialog = (qrCode: string) => {
    setScannerOpen(false);
    processScan(qrCode);
    setScannerPurpose(null);
  };
  
  const scannerTitles: Record<ScanPurpose, string> = {
    'checkout-worker': 'Escanear ID de Usuario para Entrega',
    'checkout-tool': 'Escanear QR de Herramienta para Entrega',
    'return-tool': 'Escanear QR de Herramienta a Devolver'
  };
  
  const scannerDescriptions: Record<ScanPurpose, string> = {
    'checkout-worker': 'Apunta la cámara al código QR del carnet del usuario.',
    'checkout-tool': 'Escanea los códigos QR de las herramientas a entregar.',
    'return-tool': 'Escanea el QR de la herramienta que se devuelve.'
  };

  return (
    <>
    {isScannerOpen && scannerPurpose && (
        <QrScannerDialog 
            open={isScannerOpen} 
            onOpenChange={setScannerOpen}
            onScan={handleScanFromDialog}
            title={scannerTitles[scannerPurpose]}
            description={scannerDescriptions[scannerPurpose]}
        />
      )}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft /> Entrega y Devolución Rápida
        </CardTitle>
        <CardDescription>Usa los paneles de abajo para registrar movimientos de herramientas de forma manual o con escáner.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        <div className="p-4 border rounded-lg space-y-4">
          <h3 className="font-semibold">Panel de Selección Manual</h3>
          {!returnMode ? (
            <>
              <div className="space-y-2">
                <Label>1. Selecciona Trabajador</Label>
                <Select value={manualWorkerId} onValueChange={handleManualWorkerSelect}>
                  <SelectTrigger><SelectValue placeholder="Elige un trabajador..." /></SelectTrigger>
                  <SelectContent>
                    {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>2. Agrega Herramienta</Label>
                <div className="flex gap-2">
                  <Select value={manualToolId} onValueChange={setManualToolId} disabled={!checkoutState.worker}>
                    <SelectTrigger><SelectValue placeholder="Elige una herramienta..." /></SelectTrigger>
                    <SelectContent>
                      {availableTools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleManualToolSelect} disabled={!manualToolId || !checkoutState.worker}>Añadir</Button>
                </div>
              </div>
            </>
          ) : (
             <div className="space-y-4">
                <Label>Selecciona Herramienta a Devolver</Label>
                 <div className="flex gap-2">
                    <Select value={manualToolId} onValueChange={setManualToolId}>
                        <SelectTrigger><SelectValue placeholder="Elige una herramienta..." /></SelectTrigger>
                        <SelectContent>
                        {checkedOutTools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleManualReturn} disabled={!manualToolId}>Devolver</Button>
                </div>
             </div>
          )}
        </div>

        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
                 <h3 className="font-semibold">Panel de Escáner</h3>
                 <Button variant="outline" size="sm" onClick={() => { setReturnMode(!returnMode); handleCancel(); }}>
                    Cambiar a modo {returnMode ? 'Entrega' : 'Devolución'}
                </Button>
            </div>
             <form onSubmit={handlePistolScanSubmit}>
                <Label htmlFor="pistol-input">Entrada de Escáner de Pistola</Label>
                <Input
                  id="pistol-input"
                  placeholder={returnMode ? "Escanear herramienta a devolver..." : "Escanear trabajador o herramienta..."}
                  value={pistolInput}
                  onChange={(e) => setPistolInput(e.target.value)}
                  autoComplete="off"
                />
            </form>
            <Button variant="outline" className="w-full" onClick={() => openScanner(returnMode ? 'return-tool' : (checkoutState.worker ? 'checkout-tool' : 'checkout-worker'))}>
                <ScanLine className="mr-2 h-4 w-4" /> Usar Cámara del Dispositivo
            </Button>
        </div>
        
        <div className="md:col-span-2 space-y-4 p-4 border-2 border-dashed rounded-lg">
           <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-lg">
                  {returnMode ? "Proceso de Devolución Actual" : "Proceso de Entrega Actual"}
              </h4>
            </div>
            {!returnMode && !checkoutState.worker ? (
                <div className='text-center py-8 text-muted-foreground'>
                    <User className="mx-auto h-8 w-8 mb-2"/>
                    <p>Selecciona o escanea un trabajador para empezar la entrega.</p>
                </div>
            ) : null}

            {!returnMode && checkoutState.worker ? (
                <div className="space-y-4">
                    <div className="p-3 rounded-md bg-muted flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Entregando a:</p>
                            <p className="font-semibold">{checkoutState.worker.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { handleCancel(); setManualWorkerId(''); }}>
                            <X className="h-4 w-4"/>
                            <span className="sr-only">Cancelar Entrega</span>
                        </Button>
                    </div>

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
            ) : null}

            {returnMode ? (
                <div className="space-y-4">
                     <div className='text-center py-4 text-muted-foreground'>
                        <p>Selecciona o escanea una herramienta para registrar su devolución.</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-4 border-t">
                        <Checkbox id="damaged" checked={isDamaged} onCheckedChange={(checked) => setIsDamaged(checked as boolean)} />
                        <Label htmlFor="damaged" className="text-destructive font-medium">Devuelta con daños</Label>
                    </div>
                    <Textarea 
                        placeholder="Describe el daño o problema..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        disabled={!isDamaged}
                    />
                </div>
            ) : null}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
