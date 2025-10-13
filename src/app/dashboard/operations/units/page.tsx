
"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CreateUnitForm } from "@/components/admin/create-unit-form";

export default function OperationsUnitsPage() {
    const { units } = useAppState();

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Unidades"
                description="Crea y gestiona las unidades de medida del sistema."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Añadir Nueva Unidad</CardTitle>
                            <CardDescription>Añade una nueva unidad para usarla en materiales y solicitudes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CreateUnitForm />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Lista de Unidades</CardTitle>
                            <CardDescription>Todas las unidades registradas en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[calc(80vh-10rem)] border rounded-md">
                                <div className="space-y-4 p-4">
                                    {(units || []).map(unit => (
                                        <div key={unit.id} className="flex items-center justify-between p-4 rounded-lg border gap-4">
                                            <p className="font-semibold">{unit.name}</p>
                                        </div>
                                    ))}
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
