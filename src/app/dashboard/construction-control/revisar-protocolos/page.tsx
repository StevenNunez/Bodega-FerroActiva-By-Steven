"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function RevisarProtocolosPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Revisar Protocolos de Calidad"
        description="Bandeja de entrada para la revisión y aprobación de partidas finalizadas."
      />
      <Alert>
        <Construction className="h-4 w-4" />
        <AlertTitle>En Construcción</AlertTitle>
        <AlertDescription>
          Esta sección está en desarrollo. Pronto podrás revisar y aprobar los protocolos de calidad aquí.
        </AlertDescription>
      </Alert>
    </div>
  );
}
