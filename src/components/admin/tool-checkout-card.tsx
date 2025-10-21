'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, User, ArrowRight, X, ScanLine } from 'lucide-react';
import type { User as UserType, Tool as ToolType, ToolLog } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '../ui/input';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });
type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

// --- Sanitizador robusto
const sanitizeQrCode = (code: string): string => {
  if (!code) return '';
  // elimina saltos de línea, espacios sobrantes y caracteres invisibles
  return code.replace(/\uFEFF/g, '').replace(/\r?\n|\r/g, '').trim();
};

export function ToolCheckoutCard() {
  const { users, tools, checkoutTool, returnTool, user: authUser, findActiveLogForTool, toolLogs } = useAppState();
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
    const checkedOutToolIds = new Set<string>(
      toolLogs.filter(log => log.returnDate === null).map(log => log.toolId)
    );
    return {
      workers: activeWorkers,
      checkedOutTools: tools.filter(tool => checkedOutToolIds.has(tool.id)),
      availableTools: tools.filter(tool => !checkedOutToolIds.has(tool.id)),
    };
  }, [users, tools, toolLogs]);

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
    setCheckoutState(prev => ({ ...prev, tools: [...prev.tools, tool] }));
  }, [toast]);

  const handleReturn = useCallback(async (tool: ToolType) => {
    const isToolCheckedOut = checkedOutTools.some(t => t.id === tool.id);
    if (!isToolCheckedOut) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `La herramienta "${tool.name}" no está registrada como prestada en el sistema.`,
      });
      return;
    }

    const activeLog = await findActiveLogForTool(tool.id);
    if (!activeLog) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `No se encontró un registro activo para "${tool.name}". Verifica que la herramienta esté prestada.`,
      });
      return;
    }

    if (authUser) {
      try {
        await returnTool(activeLog.id, isDamaged ? 'damaged' : 'ok', returnNotes);
        toast({
          title: 'Devolución Registrada',
          description: `Herramienta "${tool.name}" devuelta exitosamente.`,
        });
        handleCancel();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Error al registrar la devolución: ${(error as Error).message}`,
        });
      }
    }
  }, [isDamaged, returnNotes, authUser, returnTool, toast, handleCancel, findActiveLogForTool, checkedOutTools]);

 const findToolFromScanned = useCallback(
  (rawCode: string): ToolType | null => {
    if (!rawCode) return null;

    const code = sanitizeQrCode(rawCode);
    const up = (s?: string) => s ? s.trim().toUpperCase() : '';
    
    // Normalizador inteligente que reemplaza cualquier no alfanumérico con un guion
    const normalize = (s: string) => up(s).replace(/[^A-Z0-9]/g, '-');
    const normalizedCode = normalize(code);

    // 1. Coincidencia exacta del código normalizado
    for (const t of tools) {
      if (normalize(t.qrCode) === normalizedCode) {
        return t;
      }
    }
    
    // 2. Coincidencia exacta del ID (a menudo el final del código)
    for (const t of tools) {
      if (up(t.id) === up(code)) {
        return t;
      }
    }
    
    // 3. Fallback: Si el código contiene el ID de la herramienta
    // Esto es útil si el escáner añade prefijos/sufijos
    for (const t of tools) {
      if (normalizedCode.includes(up(t.id))) {
        return t;
      }
    }

    // 4. Fallback final: nombre exacto (menos fiable)
    for (const t of tools) {
        if(up(t.name) === up(code)) {
            return t;
        }
    }

    return null;
  },
  [tools]
);

  const findUserFromScanned = useCallback(
    (finalCode: string) => {
      if (!finalCode) return null;
      // try exact match by qrCode or id
      const exact = users.find(u => u.qrCode === finalCode || u.id === finalCode);
      if (exact) return exact;

      // split by '
      const parts = finalCode.split("'");
      if (parts.length >= 2) {
        const candidateId = parts[1] || parts[0];
        const byId = users.find(u => u.id === candidateId || (u.qrCode && u.qrCode.includes(candidateId)));
        if (byId) return byId;
      }

      // fallback by tokens
      const tokens = finalCode.split(/[^A-Za-z0-9_-]+/).filter(Boolean);
      for (const tok of tokens) {
        const byId = users.find(u => u.id === tok);
        if (byId) return byId;
      }

      // last resort: partial name match
      const up = finalCode.toUpperCase();
      const byName = users.find(u => u.name && u.name.toUpperCase().includes(up));
      if (byName) return byName;

      return null;
    },
    [users]
  );

  const processScan = useCallback(
    (scannedCode: string) => {
      const finalCode = sanitizeQrCode(scannedCode);
      console.log('DEBUG - scanned code:', scannedCode, '-> sanitized:', finalCode);
      if (!finalCode) {
        toast({ variant: 'destructive', title: 'Error', description: 'Entrada vacía.' });
        return;
      }

      const upper = finalCode.toUpperCase();

      // 1) Intentar reconocer usuario
      if (upper.startsWith('USER') || upper.includes('USER')) {
        const user = findUserFromScanned(finalCode);
        if (user) {
          setCheckoutState({ worker: user, tools: [] });
          toast({ title: 'Trabajador Seleccionado', description: `Listo para entregar a: ${user.name}.` });
          return;
        }
        // si decía USER pero no se encontró, avisar
        const maybeId = finalCode.split("'")[1] || finalCode.split('-')[1] || finalCode;
        toast({ variant: 'destructive', title: 'Error', description: `Usuario no encontrado: ${maybeId}` });
        return;
      }

      // 2) Intentar reconocer herramienta
      const tool = findToolFromScanned(finalCode);
      if (tool) {
        if (returnMode) {
          handleReturn(tool);
          return;
        }

        if (!checkoutStateRef.current.worker) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Escanea primero el QR de un trabajador.',
          });
          return;
        }
        handleToolToCheckout(tool);
        return;
      }

      // 3) Si no es usuario ni herramienta, probar con el usuario de nuevo por si acaso
      const maybeUser = findUserFromScanned(finalCode);
      if (maybeUser) {
        setCheckoutState({ worker: maybeUser, tools: [] });
        toast({ title: 'Trabajador Seleccionado', description: `Listo para entregar a: ${maybeUser.name}.` });
        return;
      }

      toast({ variant: 'destructive', title: 'Error', description: 'Entrada no reconocida. Verifica el formato del QR.' });
    },
    [toast, findToolFromScanned, findUserFromScanned, returnMode, handleReturn, handleToolToCheckout]
  );

  const handlePistolScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = pistolInput.trim();
    if (code) processScan(code);
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
    const toolToAdd = tools.find(t => t.id === manualToolId);
    if (toolToAdd) handleToolToCheckout(toolToAdd);
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
        toast({
          title: 'Entrega Registrada',
          description: `${checkoutState.tools.length} herramienta(s) entregada(s) a ${checkoutState.worker.name}.`,
        });
        handleCancel();
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la entrega.' });
      }
    }
  };

  const removeToolFromCart = (toolId: string) =>
    setCheckoutState(prev => ({ ...prev, tools: prev.tools.filter(t => t.id !== toolId) }));

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
    'return-tool': 'Escanear QR de Herramienta a Devolver',
  };

  const scannerDescriptions: Record<ScanPurpose, string> = {
    'checkout-worker': 'Apunta la cámara al código QR del carnet del usuario.',
    'checkout-tool': 'Escanea los códigos QR de las herramientas a entregar.',
    'return-tool': 'Escanea el QR de la herramienta que se devuelve.',
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
          <CardDescription>
            Usa los paneles de abajo para registrar movimientos de herramientas de forma manual o con escáner.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Panel manual */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">Panel de Selección Manual</h3>
            {!returnMode ? (
              <>
                <div className="space-y-2">
                  <Label>1. Selecciona Trabajador</Label>
                  <Select value={manualWorkerId} onValueChange={handleManualWorkerSelect}>
                    <SelectTrigger><SelectValue placeholder="Elige un trabajador..." /></SelectTrigger>
                    <SelectContent>
                      {workers.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>2. Agrega Herramienta</Label>
                  <div className="flex gap-2">
                    <Select value={manualToolId} onValueChange={setManualToolId} disabled={!checkoutState.worker}>
                      <SelectTrigger><SelectValue placeholder="Elige una herramienta..." /></SelectTrigger>
                      <SelectContent>
                        {availableTools.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.qrCode ? `(${t.qrCode})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleManualToolSelect} disabled={!manualToolId || !checkoutState.worker}>
                      Añadir
                    </Button>
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
                      {checkedOutTools.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.qrCode ? `(${t.qrCode})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleManualReturn} disabled={!manualToolId}>
                    Devolver
                  </Button>
                </div>
              </div>
            )}
          </div>
          {/* Panel escáner */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Panel de Escáner</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReturnMode(!returnMode);
                  handleCancel();
                }}
              >
                Cambiar a modo {returnMode ? 'Entrega' : 'Devolución'}
              </Button>
            </div>
            <form onSubmit={handlePistolScanSubmit}>
              <Label htmlFor="pistol-input">Entrada de Escáner de Pistola</Label>
              <Input
                id="pistol-input"
                placeholder={returnMode ? 'Escanear herramienta a devolver...' : 'Escanear trabajador o herramienta...'}
                value={pistolInput}
                onChange={e => setPistolInput(e.target.value)}
                autoComplete="off"
              />
            </form>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openScanner(returnMode ? 'return-tool' : checkoutState.worker ? 'checkout-tool' : 'checkout-worker')}
            >
              <ScanLine className="mr-2 h-4 w-4" /> Usar Cámara del Dispositivo
            </Button>
          </div>
          {/* Estado actual */}
          <div className="md:col-span-2 space-y-4 p-4 border-2 border-dashed rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-lg">
                {returnMode ? 'Proceso de Devolución Actual' : 'Proceso de Entrega Actual'}
              </h4>
            </div>
            {!returnMode && !checkoutState.worker && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto h-8 w-8 mb-2" />
                <p>Selecciona o escanea un trabajador para empezar la entrega.</p>
              </div>
            )}
            {!returnMode && checkoutState.worker && (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Entregando a:</p>
                    <p className="font-semibold">{checkoutState.worker.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      handleCancel();
                      setManualWorkerId('');
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancelar Entrega</span>
                  </Button>
                </div>
                {checkoutState.tools.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Herramientas en Carrito ({checkoutState.tools.length}):</h5>
                    <ScrollArea className="h-32">
                      <ul className="space-y-1 pr-4">
                        {checkoutState.tools.map(tool => (
                          <li
                            key={`cart-${tool.id}`}
                            className="flex items-center justify-between text-sm bg-secondary p-2 rounded-md"
                          >
                            <span>{tool.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeToolFromCart(tool.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleConfirmCheckout}
                  disabled={checkoutState.tools.length === 0}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> Confirmar Entrega ({checkoutState.tools.length})
                </Button>
              </div>
            )}
            {returnMode && (
              <div className="space-y-4">
                <div className="text-center py-4 text-muted-foreground">
                  <p>Selecciona o escanea una herramienta para registrar su devolución.</p>
                </div>
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Checkbox
                    id="damaged"
                    checked={isDamaged}
                    onCheckedChange={checked => setIsDamaged(checked as boolean)}
                  />
                  <Label htmlFor="damaged" className="text-destructive font-medium">
                    Devuelta con daños
                  </Label>
                </div>
                <Textarea
                  placeholder="Describe el daño o problema..."
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  disabled={!isDamaged}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
