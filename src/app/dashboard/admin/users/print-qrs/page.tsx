"use client";

import React, { useState, useMemo } from "react";
import { useAppState } from "@/contexts/app-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PrintUserQrPage() {
  const { users, isLoading } = useAppState();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const handlePrint = () => {
    window.print();
  };
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
        return users;
    }
    return users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'worker': return 'Colaborador';
      case 'operations': return 'Jefe de Operaciones';
      case 'apr': return 'APR';
      case 'guardia': return 'Guardia';
      default: return 'Usuario';
    }
  }

  return (
    <div className="print-container flex flex-col gap-8">
      {/* Controles solo visibles en pantalla */}
      <div className="print-hide">
         <PageHeader
            title="Imprimir Credenciales de Usuarios"
            description="Usa el buscador para filtrar por nombre y luego el botón 'Imprimir' para generar las credenciales."
        />
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
             <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Credenciales
            </Button>
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
        </div>
        <div className="mb-8">
            <Input 
                placeholder="Buscar usuario por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </div>
      
      {/* Área imprimible */}
      <Card>
        <CardContent className="p-4 md:p-6 print-content">
            <div className="grid print-grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {isLoading ? (
                    Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center justify-center p-4 border rounded-lg aspect-[54/86] bg-muted animate-pulse" />
                    ))
                ) : (
                    filteredUsers.map((user) => (
                    <div key={user.id} className="flex qr-item flex-col items-center justify-between text-center p-3 border-2 border-dashed rounded-lg aspect-[54/86] break-inside-avoid bg-background">
                        <div className='text-center'>
                            <h3 className="font-bold text-lg leading-tight">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{getRoleDisplayName(user.role)}</p>
                        </div>
                        <div className="p-1 bg-white rounded-md my-2">
                            <QRCodeSVG value={user.qrCode} size={128} className="w-full max-w-[128px] h-auto" />
                        </div>
                        <div className='text-center'>
                            <p className="text-xs font-mono text-muted-foreground">{user.id}</p>
                            <p className="text-xs font-bold text-primary">CONSTRUCTORA FERROACTIVA</p>
                        </div>
                    </div>
                    ))
                )}
                 {filteredUsers.length === 0 && !isLoading && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No se encontraron usuarios con ese nombre.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hide { display: none !important; }
          .print-container { gap: 0 !important; }
          .print-grid {
             display: grid;
             grid-template-columns: repeat(3, 1fr) !important;
             gap: 0.2rem;
          }
          .qr-item {
             border: 1px dashed #999;
             padding: 0.5rem;
             page-break-inside: avoid;
             height: 8.6cm; 
             width: 5.4cm;
             justify-content: space-between;
             align-items: center;
             background-color: #fff !important;
             color: #000 !important;
          }
          .qr-item h3 { font-size: 11pt; font-weight: bold; color: #000 !important; }
          .qr-item p { font-size: 8pt; color: #333 !important; }
          .qr-item .text-muted-foreground { color: #555 !important; }
          .qr-item .text-primary { color: #f97316 !important; }
          .qr-item .bg-white { padding: 2px; }
          .qr-item svg { width: 4cm; height: 4cm; }
          .print-content { padding: 0 !important; background-color: #fff !important; }
          .card { background-color: #fff !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
