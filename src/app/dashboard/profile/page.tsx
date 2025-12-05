"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/modules/auth/useAuth';
import { PageHeader } from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  QrCode, 
  KeyRound, 
  AtSign, 
  Edit, 
  Phone, 
  Briefcase, 
  CalendarDays, 
  Building2, 
  HeartPulse, 
  Users 
} from 'lucide-react';
import QRCode from "react-qr-code";
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { ChangeEmailDialog } from '@/components/change-email-dialog';
import { EditUserForm } from '@/components/admin/edit-user-form';
import { UserRole } from '@/modules/core/lib/data';
import { Timestamp } from 'firebase/firestore';
import { ROLES } from '@/modules/core/lib/permissions';

// --- Utility Functions ---

const getRoleDisplayName = (role: UserRole | undefined): string => {
    if (!role) return 'Rol no asignado';
    return ROLES[role]?.label || role;
};

const formatDate = (date: Date | Timestamp | string | number | null | undefined): string => {
    if (!date) return 'No especificada';
    
    try {
        const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date);
        
        // Validar si la fecha es válida
        if (isNaN(jsDate.getTime())) return 'Fecha inválida';

        return new Intl.DateTimeFormat('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(jsDate);
    } catch (error) {
        console.error("Error formateando fecha:", error);
        return 'Error en fecha';
    }
}

// --- Sub-components (para reducir repetición) ---

interface InfoFieldProps {
    label: string;
    value: string | number | null | undefined;
    icon?: React.ElementType;
}

const InfoField = ({ label, value, icon: Icon }: InfoFieldProps) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary/70" />}
            {label}
        </p>
        <p className="font-medium text-foreground">
            {value || <span className="text-muted-foreground italic text-sm">No especificado</span>}
        </p>
    </div>
);

// --- Main Component ---

export default function ProfilePage() {
    const { user, authLoading } = useAuth();
    const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);

    // Memorizamos el nombre del rol para evitar re-cálculos innecesarios
    const roleName = useMemo(() => getRoleDisplayName(user?.role), [user?.role]);
    const formattedDate = useMemo(() => formatDate(user?.fechaIngreso), [user?.fechaIngreso]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <p className="text-muted-foreground">No se pudo cargar la información del usuario.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Dialogs */}
            <ChangePasswordDialog 
                isOpen={isPasswordDialogOpen} 
                onClose={() => setPasswordDialogOpen(false)} 
            />
            <ChangeEmailDialog 
                isOpen={isEmailDialogOpen} 
                onClose={() => setEmailDialogOpen(false)} 
            />
            
            {isEditingUser && (
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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda - QR y Cuenta */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Tarjeta de Credencial */}
                    <Card className="overflow-hidden border-primary/10 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <QrCode className="h-5 w-5 text-primary" /> Mi Credencial
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center pt-6 pb-8">
                            <div className="p-3 bg-white rounded-xl shadow-sm border mb-4">
                                <QRCode 
                                    value={user.qrCode || user.id} // Fallback al ID si no hay QR code específico
                                    size={160}
                                    level="H" // High error correction level
                                />
                            </div>
                            <h3 className="mt-2 font-bold text-xl text-foreground">{user.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                                {roleName}
                            </span>
                        </CardContent>
                    </Card>

                    {/* Tarjeta de Cuenta */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Seguridad de la Cuenta</CardTitle>
                            <CardDescription>Gestiona tus credenciales de acceso.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium mb-1">Correo Electrónico</p>
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <span className="text-sm truncate">{user.email}</span>
                                    <AtSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start hover:bg-primary/5 hover:text-primary transition-colors" 
                                    onClick={() => setEmailDialogOpen(true)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Cambiar Correo
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start hover:bg-primary/5 hover:text-primary transition-colors" 
                                    onClick={() => setPasswordDialogOpen(true)}
                                >
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Cambiar Contraseña
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha - Información de Planilla */}
                <div className="lg:col-span-2">
                    <Card className="h-full shadow-sm">
                        <CardHeader className="border-b bg-muted/10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-primary" />
                                        Información de Planilla
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Tus datos personales y previsionales registrados en el sistema.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setIsEditingUser(true)} size="sm">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Datos
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                                <InfoField 
                                    label="RUT" 
                                    value={user.rut} 
                                    icon={Users}
                                />
                                <InfoField 
                                    label="Teléfono" 
                                    value={user.phone} 
                                    icon={Phone} 
                                />
                                <InfoField 
                                    label="Cargo / Puesto" 
                                    value={user.cargo} 
                                    icon={Briefcase} 
                                />
                                <InfoField 
                                    label="Fecha de Ingreso" 
                                    value={formattedDate} 
                                    icon={CalendarDays} 
                                />
                                <InfoField 
                                    label="AFP" 
                                    value={user.afp} 
                                    icon={Building2} 
                                />
                                <InfoField 
                                    label="Sistema de Salud" 
                                    value={user.tipoSalud} 
                                    icon={HeartPulse} 
                                />
                                <InfoField 
                                    label="Cargas Familiares" 
                                    value={user.cargasFamiliares?.toString()} 
                                    icon={Users} 
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
