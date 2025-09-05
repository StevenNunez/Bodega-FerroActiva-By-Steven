
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAppState } from "@/contexts/app-provider";
import { useToast } from "@/hooks/use-toast";
import type { ToolLog } from "@/lib/data";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (qrCode: string) => void;
  title: string;
  description: string;
  purpose?: string; // e.g., 'checkout-worker', 'checkout-tool', 'return-tool'
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
  title,
  description,
  purpose,
}: QrScannerDialogProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<"success" | "fail" | null>(null);
  const { tools, users, toolLogs } = useAppState();
  const { toast } = useToast();

  const [availableQrCodes, setAvailableQrCodes] = useState<string[]>([]);

  useEffect(() => {
    let relevantQRs: string[] = [];
    const checkedOutToolsLogs: ToolLog[] = toolLogs.filter(log => log.returnDate === null);
    const checkedOutToolIds: string[] = checkedOutToolsLogs.map(log => log.toolId);

    if (purpose === 'checkout-worker') {
        relevantQRs = users.filter(u => u.role === 'worker' && u.qrCode).map(u => u.qrCode as string);
    } else if (purpose === 'checkout-tool') {
        relevantQRs = tools.filter(t => !checkedOutToolIds.includes(t.id) && t.qrCode).map(t => t.qrCode);
    } else if (purpose === 'return-tool') {
        relevantQRs = tools.filter(t => checkedOutToolIds.includes(t.id) && t.qrCode).map(t => t.qrCode);
    } else {
        const toolQRs = tools.map(t => t.qrCode);
        const userQRs = users.map(u => u.qrCode).filter((qr): qr is string => !!qr);
        relevantQRs = [...toolQRs, ...userQRs];
    }
    setAvailableQrCodes(relevantQRs);
  }, [tools, users, toolLogs, purpose, open]);


  const handleSimulateScan = () => {
    if (availableQrCodes.length === 0) {
        toast({variant: 'destructive', title: 'Error de Simulación', description: 'No hay códigos QR válidos para escanear en esta acción.'})
        return;
    }
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      // Simulate a successful scan with a relevant QR code
      setScanResult("success");
      const mockQrCode = availableQrCodes[Math.floor(Math.random() * availableQrCodes.length)];
      onScan(mockQrCode);
      
      setTimeout(() => {
          onOpenChange(false);
           // Reset state for the next time
           setIsScanning(false);
           setScanResult(null);
      }, 1000); 

    }, 1500);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing the dialog
      setIsScanning(false);
      setScanResult(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onInteractOutside={(e) => { if(isScanning) e.preventDefault(); }} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="my-4 flex aspect-square w-full items-center justify-center rounded-lg bg-slate-900">
          <div className="relative h-48 w-48 overflow-hidden rounded-md">
             {isScanning && !scanResult && (
                <div className="absolute top-0 left-0 h-full w-full">
                    <div className="h-full w-full animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary/50 to-transparent"></div>
                </div>
             )}
            <div className="absolute inset-0 flex items-center justify-center">
              {!isScanning && <QrCode className="h-24 w-24 text-slate-600" />}
              {isScanning && !scanResult && <Loader2 className="h-16 w-16 animate-spin text-slate-400" />}
              {scanResult === 'success' && <CheckCircle className="h-24 w-24 text-green-500" />}
              {scanResult === 'fail' && <XCircle className="h-24 w-24 text-destructive" />}
            </div>
            <div className="absolute top-0 left-0 border-l-4 border-t-4 border-slate-400 w-8 h-8 rounded-tl-md"></div>
            <div className="absolute top-0 right-0 border-r-4 border-t-4 border-slate-400 w-8 h-8 rounded-tr-md"></div>
            <div className="absolute bottom-0 left-0 border-l-4 border-b-4 border-slate-400 w-8 h-8 rounded-bl-md"></div>
            <div className="absolute bottom-0 right-0 border-r-4 border-b-4 border-slate-400 w-8 h-8 rounded-br-md"></div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => handleClose(false)} disabled={isScanning}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSimulateScan} disabled={isScanning}>
            {isScanning ? (scanResult === 'fail' ? 'Intente de nuevo' : 'Escaneando...') : 'Simular Escaneo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const styles = `
@keyframes scan {
  0% { transform: translateY(-100%); }
  50% { transform: translateY(100%); }
  100% { transform: translateY(-100%); }
}
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}