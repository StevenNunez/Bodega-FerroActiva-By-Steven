
"use client";

import React from 'react';
import { useAuth } from '@/modules/core/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function UserCredentialCard() {
  const { user } = useAuth();
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'bodega-admin': return 'Jefe de Bodega';
      case 'supervisor': return 'Supervisor';
      case 'worker': return 'Colaborador';
      case 'operations': return 'Administrador de Obra';
      case 'apr': return 'APR';
      case 'guardia': return 'Guardia';
      case 'finance': return 'Jefe de Adm. y Finanzas';
      case 'super-admin': return 'Super Administrador';
      case 'cphs': return 'Comité Paritario';
      default: return 'Usuario';
    }
  }

  if (!user || !user.qrCode) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/20 to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><QrCode /> Mi Credencial Digital</CardTitle>
        <CardDescription>Usa este QR para registrar tu asistencia o el retiro y devolución de herramientas.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center p-6 pt-0">
        <div className="p-2 bg-white rounded-lg">
            <QRCodeSVG value={user.qrCode} size={150} />
        </div>
        <p className="mt-4 font-bold text-lg">{user.name}</p>
        <p className="text-muted-foreground">{getRoleDisplayName(user.role)}</p>
      </CardContent>
    </Card>
  );
}
