'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/app-provider';
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
  const upperCode = code.toUpperCase();
  if (upperCode.startsWith("USER")) {
    // For users, IDs can have mixed case, so just replace the quote
    return code.replace(/'/g, "-");
  }
  if (upperCode.startsWith("TOOL")) {
    // For tools, we can be more aggressive, but let's stick to replacing quotes
    return code.replace(/'/g, "-");
  }
  return code;
};


export function ToolCheckoutCard() {
  const { users, tools, toolLogs, checkoutTool, returnTool, user: authUser } = useAppState();
  const { toast } = useToast();

  const [workers, setWorkers] = useState<UserType[]>([]);
  const [checkedOutTools, setCheckedOutTools] = useState<ToolType[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolType[]>([]);

  // Main state
  const [checkoutState, setCheckoutState] = useState<{ worker?: UserType; tools: ToolType[] }>({ tools: [] });
  const [returnMode, setReturnMode] = useState(false);

  // Manual selection state
  const [manualWorkerId, setManualWorkerId] = useState('');
  const [manualToolId, setManualToolId] = useState('');
  
  // Pistol scanner state
  const [pistolInput, setPistolInput] = useState('');
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<ScanPurpose | null>(null);

  // Return state
  const [isDamaged, setIsDamaged] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  
  // Update ref whenever state changes
  const checkoutStateRef = useRef(checkoutState);
  useEffect(() => {
    checkoutStateRef.current = checkoutState;
  }, [checkoutState]);

  // --- Data Memos ---
  useMemo(() => {
    setWorkers(users.filter(u => u.role !== 'guardia'));
    const checkedOutToolIds = new Set(toolLogs.filter(log => log.returnDate === null).map(log => log.toolId));
    setCheckedOutTools(tools.filter(tool => checkedOutToolIds.has(tool.id)));
    setAvailableTools(tools.filter(tool => !checkedOutToolIds.has(tool.id)));
  }, [users, tools, toolLogs]);
  
  
  // --- Core Logic Actions ---
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
    const isAvailable = availableTools.some(t => t.id === tool.id);
    if (!isAvailable) {
        toast({ variant: 'destructive', title: 'Error', description: `"${tool.name}" no está disponible.` });
        return;
    }
    setCheckoutState(prev => ({ ...prev, tools: [...prev.tools, tool] }));
  }, [availableTools, toast]);
  
  const handleReturn = useCallback(async (tool: ToolType) => {
    const logToReturn = toolLogs.find(log => log.toolId === tool.id && log.returnDate === null);
    if (!logToReturn) {
      toast({ variant: 'destructive', title: 'Error', description: 'Esta herramienta no figura como prestada.' });
      return;
    }
    if (authUser) {
      await returnTool(logToReturn.id, isDamaged ? 'damaged' : 'ok', returnNotes);
      toast({ title: 'Devolución Registrada', description: `Herramienta "${tool.name}" devuelta.` });
      handleCancel();
    }
  }, [toolLogs, isDamaged, returnNotes, authUser, returnTool, toast, handleCancel]);

  const processScan = useCallback((scannedCode: string) => {
    const finalCode = sanitizeQrCode(scannedCode);
    
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


  // --- Pistol Scanner Logic ---
  const handlePistolScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = pistolInput.trim();
    if (code) {
      processScan(code);
    }
    setPistolInput('');
  };


  // --- Manual Actions ---
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
  
  const handleManualReturn = () => {
      const toolToReturn = checkedOutTools.find(t => t.id === manualToolId);
      if (toolToReturn) {
        handleReturn(toolToReturn);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'La herramienta seleccionada no figura como prestada.' });
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
  
  // --- Camera Scanner Logic ---
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
        
        {/* --- Manual Panel --- */}
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

        {/* --- Scanner Panel --- */}
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
        
        {/* --- Transaction State --- */}
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

            {/* --- Entrega --- */}
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

            {/* --- Devolución --- */}
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
