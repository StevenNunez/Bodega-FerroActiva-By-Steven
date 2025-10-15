'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppState, useAuth } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, User, Wrench, ArrowRight, Undo2, X, ChevronDown, ScanLine, Check } from 'lucide-react';
import type { User as UserType, Tool as ToolType } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

const QrScannerDialog = dynamic(() => import('@/components/qr-scanner-dialog').then(mod => mod.QrScannerDialog), {
  ssr: false,
});

type ScanPurpose = 'checkout-worker' | 'checkout-tool' | 'return-tool';

const normalizeString = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

export function ToolCheckoutCard() {
  const { users, tools, toolLogs, checkoutTool, returnTool } = useAppState();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<ScanPurpose | null>(null);

  const [checkoutState, setCheckoutState] = useState<{ worker?: UserType; tools: ToolType[] }>({ tools: [] });

  const [isDamaged, setIsDamaged] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');

  const [returnMode, setReturnMode] = useState(false);

  // State for the combobox
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const checkedOutTools = useMemo(() => toolLogs.filter(log => log.returnDate === null), [toolLogs]);
  const checkedOutToolIds = useMemo(() => new Set(checkedOutTools.map(log => log.toolId)), [checkedOutTools]);

  const handleSelection = (value: string, type: 'user' | 'tool') => {
    setSearchValue(''); // Reset input after selection
    setComboboxOpen(false);

    if (type === 'user') {
      const worker = users.find(u => u.name.toLowerCase() === value.toLowerCase());
      if (worker) {
        setCheckoutState({ worker, tools: [] });
        toast({ title: 'Trabajador Seleccionado', description: `Nombre: ${worker.name}. Ahora selecciona las herramientas.` });
      }
    } else if (type === 'tool') {
      if (returnMode) {
        handleReturn(value);
      } else {
        if (!checkoutState.worker) {
          toast({ variant: 'destructive', title: 'Error', description: 'Primero selecciona un trabajador.' });
          return;
        }
        handleToolToCheckout(value);
      }
    }
  };

  const handleToolToCheckout = (toolIdentifier: string) => {
    const tool = tools.find(t => t.name.toLowerCase() === toolIdentifier.toLowerCase() || t.qrCode === toolIdentifier);
    if (!tool) {
      toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no encontrada.' });
      return;
    }
    if (checkedOutToolIds.has(tool.id)) {
      toast({ variant: 'destructive', title: 'Error', description: `La herramienta "${tool.name}" ya está en uso.` });
      return;
    }
    if (checkoutState.tools.some(t => t.id === tool.id)) {
      toast({ variant: 'destructive', title: 'Error', description: `La herramienta "${tool.name}" ya está en la lista.` });
      return;
    }
    setCheckoutState(prev => ({ ...prev, tools: [...prev.tools, tool] }));
    toast({ title: 'Herramienta Añadida', description: `"${tool.name}" agregada a la lista de entrega.` });
  };

  const handleReturn = async (toolIdentifier: string) => {
    const tool = tools.find(t => t.name.toLowerCase() === toolIdentifier.toLowerCase() || t.qrCode === toolIdentifier);
    const logToReturn = tool ? checkedOutTools.find(log => log.toolId === tool.id) : undefined;

    if (logToReturn && authUser) {
      await returnTool(logToReturn.id, isDamaged ? 'damaged' : 'ok', returnNotes);
      toast({ title: 'Devolución Registrada', description: `Herramienta ${tool?.name} devuelta.` });
      setIsDamaged(false);
      setReturnNotes('');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Herramienta no figura como prestada o no se encontró.' });
    }
  };
  
   const processScan = async (qrCode: string) => {
    if (scannerPurpose === 'return-tool') {
      await handleReturn(qrCode);
      return;
    }

    if (scannerPurpose === 'checkout-worker') {
        const worker = users.find(u => u.qrCode === qrCode);
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
        await handleToolToCheckout(qrCode);
    }
  };


  const handleScanFromDialog = async (qrCode: string) => {
    setScannerOpen(false);
    await processScan(qrCode);
    setScannerPurpose(null);
  };
  
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
    setSearchValue('');
    setIsDamaged(false);
    setReturnNotes('');
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
  
  const availableTools = useMemo(() => tools.filter(t => !checkedOutToolIds.has(t.id)), [tools, checkedOutToolIds]);
  const unavailableTools = useMemo(() => tools.filter(t => checkedOutToolIds.has(t.id)), [tools, checkedOutToolIds]);


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
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft /> Entrega y Devolución Rápida</CardTitle>
              <CardDescription>Busca por nombre o escanea un QR para registrar la entrega o devolución de herramientas.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm font-semibold", returnMode ? 'text-blue-500' : 'text-purple-500')}>
                      MODO: {returnMode ? 'DEVOLUCIÓN' : 'ENTREGA'}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setReturnMode(!returnMode); setSearchValue(''); }}>
                        Cambiar a modo {returnMode ? 'Entrega' : 'Devolución'}
                    </Button>
                  </div>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                <span className="truncate">
                                    {searchValue || (returnMode ? "Buscar herramienta a devolver..." : "Buscar usuario o herramienta...")}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput
                                placeholder="Escribe para buscar..."
                                value={searchValue}
                                onValueChange={setSearchValue}
                            />
                            <CommandList>
                                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                {returnMode ? (
                                    <CommandGroup heading="Herramientas en Uso">
                                        {unavailableTools
                                            .filter(tool => tool.name.toLowerCase().includes(searchValue.toLowerCase()))
                                            .map(tool => (
                                            <CommandItem key={tool.id} value={tool.name} onSelect={(currentValue) => handleSelection(currentValue, 'tool')}>
                                                <Check className={cn('mr-2 h-4 w-4 opacity-0')}/>
                                                {tool.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ) : (
                                    <>
                                        {!checkoutState.worker && (
                                            <CommandGroup heading="Usuarios">
                                                {users
                                                    .filter(user => user.name.toLowerCase().includes(searchValue.toLowerCase()))
                                                    .map(user => (
                                                    <CommandItem key={user.id} value={user.name} onSelect={(currentValue) => handleSelection(currentValue, 'user')}>
                                                        <Check className={cn('mr-2 h-4 w-4 opacity-0')} />
                                                        {user.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                        {checkoutState.worker && (
                                            <CommandGroup heading="Herramientas Disponibles">
                                                {availableTools
                                                    .filter(tool => tool.name.toLowerCase().includes(searchValue.toLowerCase()))
                                                    .map(tool => (
                                                    <CommandItem key={tool.id} value={tool.name} onSelect={(currentValue) => handleSelection(currentValue, 'tool')}>
                                                        <Check className={cn('mr-2 h-4 w-4', checkoutState.tools.some(t => t.id === tool.id) ? 'opacity-100' : 'opacity-0')} />
                                                        {tool.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                    </>
                                )}
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    {returnMode && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center space-x-2">
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
                    )}
              </div>


              <div className="grid gap-4">
                  {/* Checkout Process */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-lg">Proceso de Entrega</h4>
                    </div>
                    
                    {!checkoutState.worker ? (
                      <div className='text-center py-8 text-muted-foreground'>
                          <User className="mx-auto h-8 w-8 mb-2"/>
                          <p>Selecciona un trabajador para empezar.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                          <div className="p-3 rounded-md bg-muted flex items-center justify-between">
                              <div>
                                  <p className="text-sm text-muted-foreground">Entregando a:</p>
                                  <p className="font-semibold">{checkoutState.worker.name}</p>
                              </div>
                               <Button variant="ghost" size="icon" onClick={handleCancel}>
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
                    )}
                     <Button variant="outline" className="w-full" onClick={() => openScanner(returnMode ? 'return-tool' : (checkoutState.worker ? 'checkout-tool' : 'checkout-worker'))}>
                        <ScanLine className="mr-2 h-4 w-4" />
                        Usar Cámara del Dispositivo
                    </Button>
                  </div>
              </div>
          </CardContent>
      </Card>
    </>
  );
}
