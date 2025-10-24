"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTenantForm } from "@/components/admin/create-tenant-form";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Briefcase, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@/lib/data";

export default function SubscriptionsPage() {
    const { tenants, deleteTenant } = useAppState();
    const { toast } = useToast();

    const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
        try {
            await deleteTenant(tenantId);
            toast({
                title: "Inquilino Eliminado",
                description: `El inquilino ${tenantName} ha sido eliminado.`
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error?.message || "No se pudo eliminar el inquilino."
            });
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Suscriptores (Inquilinos)"
                description="Crea, visualiza y gestiona todos los clientes de la plataforma."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Crear Nuevo Suscriptor</CardTitle>
                            <CardDescription>Añade un nuevo cliente a la plataforma. Esto creará un entorno aislado para sus datos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CreateTenantForm />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Lista de Suscriptores</CardTitle>
                            <CardDescription>Todos los clientes registrados en la plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                                <div className="space-y-4 p-4">
                                    {tenants.map(tenant => (
                                        <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-4">
                                            <div className="flex items-center gap-4 flex-grow">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                                    <Briefcase className="h-6 w-6"/>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{tenant.name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {tenant.tenantId}</p>
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
                                                    {/* Edit functionality to be added later */}
                                                    <DropdownMenuItem disabled>
                                                        <Edit className="mr-2 h-4 w-4"/>
                                                        <span>Editar (Próximamente)</span>
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                                <span >Eliminar</span>
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Eliminar a {tenant.name}?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ¡CUIDADO! Esta acción es irreversible y eliminará al inquilino.
                                                                     No eliminará los datos asociados, pero sí el acceso.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                    onClick={() => handleDeleteTenant(tenant.id, tenant.name)}>
                                                                    Sí, eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
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