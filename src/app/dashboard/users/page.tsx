
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useAppState, useAuth } from "@/modules/core/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User, UserRole } from "@/modules/core/lib/data";
import { MoreHorizontal, Trash2, Edit, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EditUserForm } from "@/components/admin/edit-user-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/modules/core/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";


export default function AdminUsersPage() {
    const { users, deleteUser, can } = useAppState();
    const { user: authUser } = useAuth();
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { toast } = useToast();

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    const getRoleDisplayName = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'Administrador de App';
            case 'bodega-admin': return 'Jefe de Bodega';
            case 'supervisor': return 'Supervisor';
            case 'worker': return 'Colaborador';
            case 'operations': return 'Administrador de Obra';
            case 'apr': return 'APR';
            case 'guardia': return 'Guardia';
            case 'finance': return 'Jefe de Adm. y Finanzas';
            case 'super-admin': return 'Super Administrador';
            case 'cphs': return 'Comité Paritario';
        }
    }
    
    const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
        switch (role) {
            case 'super-admin':
            case 'admin': return 'destructive';
            case 'operations': return 'default';
            case 'bodega-admin': return 'secondary';
            case 'supervisor': return 'secondary';
            case 'apr': return 'secondary';
            case 'worker': return 'outline';
            default: return 'outline';
        }
    }

    const handleDeleteUser = async (userId: string, userName: string) => {
        try {
            await deleteUser(userId);
            toast({
                title: "Usuario Eliminado",
                description: `El usuario ${userName} ha sido eliminado correctamente.`
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error?.message || "No se pudo eliminar el usuario."
            });
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gestión de Usuarios"
                description="Crea, visualiza y gestiona todos los perfiles registrados en el sistema."
            />

            {editingUser && can('users:edit') && (
                <EditUserForm 
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                />
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {can('users:create') && (
                    <div className="lg:col-span-1">
                         <Card>
                            <CardHeader>
                                <CardTitle>Crear Nuevo Usuario</CardTitle>
                                <CardDescription>Añade nuevos miembros al sistema y asígnales un rol.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CreateUserForm />
                            </CardContent>
                        </Card>
                    </div>
                )}
                <div className={can('users:create') ? "lg:col-span-2" : "lg:col-span-3"}>
                     <Card>
                        <CardHeader>
                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle>Lista de Usuarios</CardTitle>
                                    <CardDescription>Todos los usuarios registrados en el sistema.</CardDescription>
                                </div>
                                {can('users:print_qr') && (
                                    <Button asChild>
                                        <Link href="/dashboard/users/print-qrs">
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Imprimir Credenciales
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[calc(80vh-12rem)] border rounded-md">
                                <div className="space-y-4 p-4">
                                    {(users || []).map((user: User) => (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-4">
                                            <div className="flex items-center gap-4 flex-grow">
                                                <Avatar className="bg-secondary text-secondary-foreground h-12 w-12">
                                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-semibold">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    <div className="flex items-center gap-2">
                                                      <Badge variant={getRoleBadgeVariant(user.role)} className="w-fit mt-1">{getRoleDisplayName(user.role)}</Badge>
                                                      {user.rut && <Badge variant="outline" className="w-fit mt-1">{user.rut}</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                             <div className="flex items-center gap-4">
                                                {user.qrCode && (
                                                    <div className="p-1 bg-white rounded-md w-fit">
                                                      <QRCodeSVG value={user.qrCode} size={48} />
                                                    </div>
                                                )}
                                                {can('users:edit') && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                                                <Edit className="mr-2 h-4 w-4"/>
                                                                <span>Editar Perfil</span>
                                                            </DropdownMenuItem>
                                                            {can('users:delete') && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                            <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                                                            <span className="text-destructive">Eliminar</span>
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>¿Estás seguro de eliminar a {user.name}?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Esta acción no se puede deshacer. Se eliminará permanentemente al usuario
                                                                                de la base de datos. La cuenta de autenticación permanecerá.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                className="bg-destructive hover:bg-destructive/90"
                                                                                onClick={() => handleDeleteUser(user.id, user.name)}>
                                                                                Sí, eliminar usuario
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
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
