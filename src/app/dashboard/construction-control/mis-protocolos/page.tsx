"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function MisProtocolosPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mis Protocolos"
        description="Aquí verás el estado de las partidas que has finalizado y enviado a revisión."
      />
      <Alert>
        <Construction className="h-4 w-4" />
        <AlertTitle>En Construcción</AlertTitle>
        <AlertDescription>
          Esta sección está en desarrollo. Pronto podrás ver el historial y estado de tus protocolos aquí.
        </AlertDescription>
      </Alert>
    </div>
  );
}
