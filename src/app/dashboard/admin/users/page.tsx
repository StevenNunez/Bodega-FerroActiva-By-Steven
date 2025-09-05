
"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/data";
import { QRCodeSVG } from 'qrcode.react';

export default function AdminUsersPage() {
    const { users } = useAppState();

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    const getRoleDisplayName = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'supervisor': return 'Supervisor';
            case 'worker': return 'Colaborador';
            case 'operations': return 'Jefe de Operaciones';
            default: return 'Usuario';
        }
    }
    
    const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'operations': return 'default';
            case 'supervisor': return 'secondary';
            case 'worker': return 'outline';
            default: return 'outline';
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Usuarios"
                description="Crea nuevos usuarios y visualiza todos los perfiles registrados en el sistema."
            />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Crear Nuevo Usuario</CardTitle>
                            <CardDescription>Añade supervisores o colaboradores al sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CreateUserForm />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Lista de Usuarios</CardTitle>
                            <CardDescription>Todos los usuarios registrados en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[calc(80vh-10rem)]">
                                <div className="space-y-4 pr-4">
                                    {users.map(user => (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-4">
                                            <div className="flex items-center gap-4 flex-grow">
                                                <Avatar className="bg-secondary text-secondary-foreground h-12 w-12">
                                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-semibold">{user.name}</p>
                                                    <Badge variant={getRoleBadgeVariant(user.role)} className="w-fit">{getRoleDisplayName(user.role)}</Badge>
                                                </div>
                                            </div>
                                            {user.qrCode && (
                                                <div className="p-2 bg-white rounded-md self-center">
                                                    <QRCodeSVG value={user.qrCode} size={64} />
                                                </div>
                                            )}
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
