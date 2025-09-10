
"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAppState } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User, UserRole } from "@/lib/data";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditUserForm } from "@/components/admin/edit-user-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";


export default function AdminUsersPage() {
    const { users, deleteUser } = useAppState();
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { toast } = useToast();

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
            case 'apr': return 'APR';
            default: return 'Usuario';
        }
    }
    
    const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'operations': return 'default';
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
                description="Crea nuevos usuarios y visualiza todos los perfiles registrados en el sistema."
            />

            {editingUser && (
                <EditUserForm 
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                />
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
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
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    <Badge variant={getRoleBadgeVariant(user.role)} className="w-fit mt-1">{getRoleDisplayName(user.role)}</Badge>
                                                </div>
                                            </div>
                                             <div className="flex items-center gap-4">
                                                {user.qrCode && (
                                                    <div className="p-1 bg-white rounded-md w-fit">
                                                      <QRCodeSVG value={user.qrCode} size={48} />
                                                    </div>
                                                )}
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
                                                            <span>Editar</span>
                                                        </DropdownMenuItem>
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
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
