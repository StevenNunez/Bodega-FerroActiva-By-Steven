"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PrintQrPage() {
  const { tools, isLoading } = useAppState();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const handlePrint = () => {
    window.print();
  };
  
  const filteredTools = useMemo(() => {
    if (!searchTerm) {
        return tools;
    }
    return tools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tools, searchTerm]);

  return (
    <div className="print-container flex flex-col gap-8">
      {/* Controles solo visibles en pantalla */}
      <div className="print-hide">
         <PageHeader
            title="Imprimir Códigos QR de Herramientas"
            description="Usa el buscador para filtrar y luego el botón 'Imprimir' para generar las etiquetas."
        />
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
             <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Etiquetas
            </Button>
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
        </div>
        <div className="mb-8">
            <Input 
                placeholder="Buscar herramienta por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </div>
      
      {/* Área imprimible */}
      <Card>
        <CardContent className="p-4 md:p-6 print-content">
            <div className="grid print-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {isLoading ? (
                    Array.from({ length: 32 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center justify-center p-2 border rounded-lg aspect-square bg-muted animate-pulse" />
                    ))
                ) : (
                    filteredTools.map((tool) => (
                    <div key={tool.id} className="flex qr-item flex-col items-center justify-center text-center p-2 border-2 border-dashed rounded-lg aspect-square break-inside-avoid">
                        <div className="p-1 bg-white rounded-md">
                            <QRCodeSVG value={tool.qrCode} size={96} className="w-full max-w-[96px] h-auto" />
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-tight text-foreground">{tool.name}</p>
                    </div>
                    ))
                )}
                 {filteredTools.length === 0 && !isLoading && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No se encontraron herramientas con ese nombre.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hide {
            display: none !important;
          }
          .print-container {
             gap: 0 !important;
          }
          .print-grid {
             display: grid;
             grid-template-columns: repeat(4, 1fr) !important;
             gap: 0.5rem;
          }
          .qr-item {
             border: 1px dashed #999;
             padding: 0.25rem;
             page-break-inside: avoid;
             height: 3.4cm; 
             justify-content: center;
             align-items: center;
             background-color: #fff !important;
          }
          .qr-item p {
              font-size: 7pt;
              margin-top: 0.2rem;
              line-height: 1.2;
              display: block !important;
              color: #000 !important;
          }
          .qr-item .bg-white {
              padding: 1px;
          }
           .qr-item svg {
              width: 1.8cm;
              height: 1.8cm;
           }
           .print-content {
             padding: 0 !important;
             background-color: #fff !important; /* 🔹 Forzar blanco solo al imprimir */
           }
           .card {
             background-color: #fff !important; /* 🔹 Card blanco en impresión */
             box-shadow: none !important;
           }
           .text-foreground { color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
