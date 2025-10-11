
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/app-provider';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, Mail, User as UserIcon } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { ChangeEmailDialog } from '@/components/change-email-dialog';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);

  if (!user) {
    return null;
  }
  
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Jefe de Bodega';
      case 'supervisor': return 'Supervisor';
      case 'worker': return 'Colaborador';
      case 'operations': return 'Administrador de Obra';
      case 'apr': return 'APR';
      case 'guardia': return 'Guardia';
      default: return 'Usuario';
    }
  }

  const formatDate = (date: Date | Timestamp | undefined) => {
      if (!date) return 'No especificada';
      const jsDate = date instanceof Timestamp ? date.toDate() : date;
      return format(jsDate, "d 'de' MMMM, yyyy", { locale: es });
  }

  return (
    <>
      <PageHeader
        title="Mi Perfil"
        description="Aquí puedes ver tu información personal, de contacto y de planilla."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserIcon /> {user.name}</CardTitle>
                    <CardDescription>{getRoleDisplayName(user.role)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
                            <Mail className="mr-2"/> Cambiar Correo
                        </Button>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                            <KeyRound className="mr-2"/> Cambiar Contraseña
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                 <CardHeader>
                    <CardTitle>Información de Planilla</CardTitle>
                    <CardDescription>Estos son tus datos para fines administrativos y de pago.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div className="border-b pb-2">
                            <dt className="text-muted-foreground">RUT</dt>
                            <dd className="font-semibold">{user.rut || 'No especificado'}</dd>
                        </div>
                        <div className="border-b pb-2">
                            <dt className="text-muted-foreground">Cargo</dt>
                            <dd className="font-semibold">{user.cargo || 'No especificado'}</dd>
                        </div>
                        <div className="border-b pb-2">
                            <dt className="text-muted-foreground">Fecha de Ingreso</dt>
                            <dd className="font-semibold">{formatDate(user.fechaIngreso)}</dd>
                        </div>
                        <div className="border-b pb-2">
                            <dt className="text-muted-foreground">AFP</dt>
                            <dd className="font-semibold">{user.afp || 'No especificada'}</dd>
                        </div>
                        <div className="border-b pb-2">
                            <dt className="text-muted-foreground">Sistema de Salud</dt>
                            <dd className="font-semibold">{user.tipoSalud || 'No especificado'}</dd>
                        </div>
                         <div className="border-b pb-2">
                            <dt className="text-muted-foreground">Cargas Familiares</dt>
                            <dd className="font-semibold">{user.cargasFamiliares ?? 0}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
      </div>

      <ChangePasswordDialog isOpen={isPasswordDialogOpen} onClose={() => setPasswordDialogOpen(false)} />
      <ChangeEmailDialog isOpen={isEmailDialogOpen} onClose={() => setEmailDialogOpen(false)} />
    </>
  );
}
