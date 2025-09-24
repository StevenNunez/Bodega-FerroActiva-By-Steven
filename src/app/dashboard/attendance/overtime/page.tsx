
"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function OvertimePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Reporte de Horas Extras"
        description="Aquí podrás visualizar y gestionar las horas extras del personal."
      />
      <Card>
        <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                <Construction className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">Módulo en Construcción</h3>
                <p className="mt-2">Esta sección para el reporte de horas extras estará disponible próximamente.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
