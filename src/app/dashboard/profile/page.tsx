
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/modules/auth/useAuth';
import { PageHeader } from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, KeyRound, AtSign, Edit, Phone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { ChangeEmailDialog } from '@/components/change-email-dialog';
import { EditUserForm } from '@/components/admin/edit-user-form';
import { UserRole } from '@/modules/core/lib/data';
import { Timestamp } from 'firebase/firestore';
import { ROLES } from '@/modules/core/lib/permissions';

const getRoleDisplayName = (role: UserRole | undefined) => {
    if (!role) return 'N/A';
    return ROLES[role]?.label || role;
};

const formatDate = (date: Date | Timestamp | null | undefined): string => {
    if (!date) return 'No especificada';
    const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date as any);
    return jsDate.toLocaleDateString('es-CL');
}

export default function ProfilePage() {
    const { user, authLoading } = useAuth();
    const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    
    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <ChangePasswordDialog 
                isOpen={isPasswordDialogOpen} 
                onClose={() => setPasswordDialogOpen(false)} 
            />
            <ChangeEmailDialog 
                isOpen={isEmailDialogOpen} 
                onClose={() => setEmailDialogOpen(false)} 
            />
            {isEditingUser && user && (
                <EditUserForm 
                    user={user}
                    isOpen={isEditingUser}
                    onClose={() => setIsEditingUser(false)}
                />
            )}
            
            <PageHeader
                title="Mi Perfil"
                description="Aquí puedes ver y gestionar tu información personal y de la cuenta."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Columna Izquierda - QR y Cuenta */}
                <div className="md:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><QrCode /> Mi Credencial</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-white rounded-lg">
                                <QRCodeSVG value={user.qrCode} size={150} />
                            </div>
                            <p className="mt-4 font-bold text-lg">{user.name}</p>
                            <p className="text-muted-foreground">{getRoleDisplayName(user.role)}</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Cuenta</CardTitle>
                             <CardDescription>Gestiona tu correo y contraseña.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium">Correo Electrónico</p>
                                <p className="text-muted-foreground text-sm">{user.email}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="w-full" onClick={() => setEmailDialogOpen(true)}><AtSign className="mr-2 h-4 w-4" />Cambiar Correo</Button>
                                <Button variant="outline" className="w-full" onClick={() => setPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Cambiar Contraseña</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha - Información de Planilla */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Información de Planilla</CardTitle>
                                    <CardDescription>Tus datos personales y previsionales registrados.</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => setIsEditingUser(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">RUT</p>
                                <p>{user.rut || 'No especificado'}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>Teléfono</p>
                                <p>{user.phone || 'No especificado'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                                <p>{user.cargo || 'No especificado'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</p>
                                <p>{formatDate(user.fechaIngreso)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">AFP</p>
                                <p>{user.afp || 'No especificada'}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Sistema de Salud</p>
                                <p>{user.tipoSalud || 'No especificado'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Cargas Familiares</p>
                                <p>{user.cargasFamiliares ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
