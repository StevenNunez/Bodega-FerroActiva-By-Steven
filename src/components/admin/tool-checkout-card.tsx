
"use client";

import React, { useState, useMemo, useRef } from "react";
import dynamic from 'next/dynamic';
import { useAppState, useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, User, Wrench, ArrowRight, Undo2, X, Trash2, ChevronDown, ScanLine } from "lucide-react";
import type { User as UserType, Tool as ToolType } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), { ssr: false });

type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

const normalizeString = (str: string) => {
  if (!str) return '';
  // Keeps only letters and numbers
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove non-alphanumeric characters
}


export function ToolCheckoutCard() {
  const { users, tools, toolLogs, checkoutTool, returnTool } = useAppState();
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

  const checkedOutTools = useMemo(() => toolLogs.filter(log => log.returnDate === null), [toolLogs]);

  const processScan = async (qrCode: string) => {
    if (scannerPurpose === 'return-tool') {
      await handleReturnScan(qrCode);
      return;
    }

    if (scannerPurpose === 'checkout-worker') {
        const sanitizedQrCode = normalizeString(qrCode);
        const worker = users.find(u => {
            if (!u.qrCode) return false;
            const sanitizedUserQr = normalizeString(u.qrCode);
            return sanitizedUserQr === sanitizedQrCode;
        });

        if (worker) {
            setCheckoutState({ worker, tools: [] });
            toast({ title: 'Trabajador Seleccionado', description: `Nombre: ${worker.name}. Ahora escanea las herramientas.` });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Código QR inválido o no corresponde a un usuario del sistema.' });
        }
        return;
    }
    
    if (scannerPurpose === 'checkout-tool') {
        if (!checkoutState.worker) {
            toast({ variant: 'destructive', title: 'Error', description: 'Primero escanea el QR de un trabajador.' });
            return;
        }
        await handleCheckoutToolScan(qrCode);
    }
  };
  
  const handleManualScan = async (qrCode: string) => {
      if (returnMode) {
          await handleReturnScan(qrCode);
      } else {
          if (!checkoutState.worker) {
              const sanitizedQrCode = normalizeString(qrCode);
              const worker = users.find(u => {
                if (!u.qrCode) return false;
                const sanitizedUserQr = normalizeString(u.qrCode);
                return sanitizedUserQr === sanitizedQrCode;
              });

              if (worker) {
                setCheckoutState({ worker, tools: [] });
                toast({ title: 'Usuario Seleccionado', description: `Nombre: ${worker.name}. Ahora escanea las herramientas.` });
              } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Código QR inválido o no corresponde a un usuario.' });
              }
          } else {
              await handleCheckoutToolScan(qrCode);
          }
      }
  }


  const handleCheckoutToolScan = async (qrCode: string) => {
    const sanitizedQrCode = normalizeString(qrCode);
    const tool = tools.find(t => {
        if (!t.qrCode) return false;
        const sanitizedToolQr = normalizeString(t.qrCode);
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
    const sanitizedQrCode = normalizeString(qrCode);
    const tool = tools.find(t => {
      if (!t.qrCode) return false;
      const sanitizedToolQr = normalizeString(t.qrCode);
      return sanitizedToolQr === sanitizedQrCode;
    });
    
    const logToReturn = tool ? checkedOutTools.find(log => log.toolId === tool.id) : undefined;
    
    if (logToReturn && authUser) {
      await returnTool(logToReturn.id, isDamaged ? 'damaged' : 'ok', returnNotes);
      const returnedTool = tools.find(t => t.id === logToReturn.toolId);
      toast({ title: 'Devolución Registrada', description: `Herramienta ${returnedTool?.name} devuelta.` });
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
          handleManualScan(manualScanInput.trim());
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
    'checkout-worker': 'Escanear ID de Usuario para Entrega',
    'checkout-tool': 'Escanear QR de Herramienta para Entrega',
    'return-tool': 'Escanear QR de Herramienta a Devolver'
  }
  const scannerDescriptions: Record<ScanPurpose, string> = {
    'checkout-worker': 'Apunta la cámara al código QR del carnet del usuario que recibirá la(s) herramienta(s).',
    'checkout-tool': 'Escanea los códigos QR de todas las herramientas a entregar.',
    'return-tool': 'Escanea el código QR de la herramienta que se está devolviendo para registrar su reingreso.'
  }

  return (
    <>
      {isScannerOpen && scannerPurpose && (
        <QrScannerDialog 
            open={isScannerOpen} 
            onOpenChange={onScannerOpenChange}
            onScan={handleScanFromDialog}
            title={scannerTitles[scannerPurpose]}
            description={scannerDescriptions[scannerPurpose]}
        />
      )}
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft /> Entrega y Devolución</CardTitle>
              <CardDescription>Usa el escáner de pistola para un proceso rápido o el escáner de cámara como alternativa.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <Label htmlFor="manual-scan">Escaneo Rápido (Lector de Pistola)</Label>
                  <form onSubmit={handleManualScanSubmit}>
                    <Input
                      ref={manualScanInputRef}
                      id="manual-scan"
                      placeholder={returnMode ? "Escanear herramienta a devolver..." : "Escanear usuario o herramienta..."}
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


              <div className="grid gap-4">
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
                          <User className="mr-2 h-4 w-4"/> Escanear Usuario (Cámara)
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
              </div>
          </CardContent>
      </Card>
    </>
  );
}
