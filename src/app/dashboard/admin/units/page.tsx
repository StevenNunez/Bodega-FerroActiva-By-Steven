
"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Unit } from "@/lib/data";
import { CreateUnitForm } from "@/components/admin/create-unit-form";

export default function AdminUnitsPage() {
    const { units, deleteUnit } = useAppState();
    const { toast } = useToast();

    const handleDeleteUnit = async (unitId: string, unitName: string) => {
        try {
            await deleteUnit(unitId);
            toast({
                title: "Unidad Eliminada",
                description: `La unidad ${unitName} ha sido eliminada correctamente.`
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error?.message || "No se pudo eliminar la unidad."
            });
        }
    }


    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Unidades"
                description="Crea, edita y gestiona todas las unidades de medida del sistema."
            />
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Añadir Nueva Unidad</CardTitle>
                            <CardDescription>Añade una nueva unidad para organizar los materiales (ej: "caja", "litro", "par").</CardDescription>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                                                <span className="text-destructive">Eliminar</span>
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Seguro que quieres eliminar "{unit.name}"?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción no se puede deshacer. Se eliminará permanentemente la unidad.
                                                                    La acción fallará si algún material o solicitud está usando esta unidad.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                    onClick={() => handleDeleteUnit(unit.id, unit.name)}>
                                                                    Sí, eliminar unidad
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
