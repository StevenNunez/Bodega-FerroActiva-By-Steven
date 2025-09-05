
"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSupplierForm } from "@/components/admin/create-supplier-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";

export default function AdminSuppliersPage() {
    const { suppliers } = useAppState();

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Proveedores"
                description="Crea nuevos proveedores y visualiza todos los perfiles registrados en el sistema."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Añadir Nuevo Proveedor</CardTitle>
                            <CardDescription>Añade nuevos proveedores al sistema para que aparezcan en las opciones de órdenes de compra.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CreateSupplierForm />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Lista de Proveedores</CardTitle>
                            <CardDescription>Todos los proveedores registrados en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[calc(80vh-10rem)]">
                                <div className="space-y-4 pr-4">
                                    {suppliers.map(supplier => (
                                        <div key={supplier.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 rounded-lg border gap-4">
                                            <div className="flex items-center gap-4 flex-grow">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                                    <Briefcase className="h-6 w-6"/>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-semibold">{supplier.name}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {supplier.categories.map(cat => (
                                                            <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}