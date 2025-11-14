
"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSupplierForm } from "@/components/admin/create-supplier-form";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MoreHorizontal, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Supplier } from "@/modules/core/lib/data";
import { EditSupplierForm } from "@/components/admin/edit-supplier-form";

export default function SuppliersPage() {
    const { suppliers } = useAppState();
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Proveedores"
                description="Crea nuevos proveedores y visualiza todos los perfiles registrados en el sistema."
            />
            
            {editingSupplier && (
                <EditSupplierForm
                    supplier={editingSupplier}
                    isOpen={!!editingSupplier}
                    onClose={() => setEditingSupplier(null)}
                />
            )}

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
                            <ScrollArea className="h-[calc(80vh-10rem)] border rounded-md">
                                <div className="space-y-4 p-4">
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingSupplier(supplier)}>
                                                        <Edit className="mr-2 h-4 w-4"/>
                                                        <span>Editar</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
