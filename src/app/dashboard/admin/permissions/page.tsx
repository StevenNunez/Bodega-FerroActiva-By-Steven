
"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/contexts/app-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, Shield } from "lucide-react";
import { UserRole } from "@/lib/data";

const permissionsByRole: Record<UserRole, { description: string, capabilities: string[] }> = {
    'super-admin': {
        description: "Control total sobre la plataforma y todos los suscriptores.",
        capabilities: [
            "tenants:create",
            "tenants:delete",
            "tenants:switch",
            "users:create_any",
            "users:manage_any",
            "permissions:assign",
            "Hereda todos los permisos de los demás roles."
        ]
    },
    'admin': {
        description: "Máximo nivel en un suscriptor. Gestiona usuarios y configuraciones.",
        capabilities: [
            "users:create",
            "users:manage",
            "settings:manage (proveedores, categorías, unidades)",
            "reports:view_all",
            "tools:checkout & return",
            "catalog:manage",
            "stock:receive_order",
            "material_requests:approve & reject",
            "Hereda permisos de 'operations' y 'apr'."
        ]
    },
     'bodega-admin': {
        description: "Responsable del día a día y del flujo de entrada/salida de la bodega.",
        capabilities: [
            "material_requests:approve",
            "material_requests:reject",
            "tools:checkout",
            "tools:return",
            "catalog:manage (sin alterar stock)",
            "stock:receive_order",
            "users:create_workers, supervisors, guardias",
            "reports:view_operational",
        ]
    },
    'operations': {
        description: "Gestión estratégica de compras e inventario de alto nivel.",
        capabilities: [
            "purchase_requests:approve & reject",
            "lots:manage",
            "orders:create",
            "payments:view",
            "stock:add_manual",
            "safety:review",
            "suppliers:manage",
            "categories:manage",
            "units:manage",
        ]
    },
    'supervisor': {
        description: "Líder en terreno, solicita los recursos necesarios.",
        capabilities: [
            "material_requests:create",
            "purchase_requests:create",
            "requests:view_own",
            "catalog:view",
            "safety:complete_checklist"
        ]
    },
    'apr': {
        description: "Guardián de la seguridad, enfocado en la prevención.",
        capabilities: [
            "safety_templates:manage",
            "safety_checklists:assign & review",
            "safety_inspections:create & review",
            "reports:view_safety",
            "Hereda permisos de solicitud de 'supervisor'."
        ]
    },
    'worker': {
        description: "El motor de la obra, utiliza los recursos asignados.",
        capabilities: [
            "tools:view_own"
        ]
    },
    'guardia': {
        description: "Rol especializado en el registro de asistencia.",
        capabilities: [
            "attendance:register"
        ]
    },
    'finance': {
        description: "Rol específico para la gestión de pagos a proveedores.",
        capabilities: [
            "payments:manage",
            "payments:register_paid",
            "suppliers:view"
        ]
    }
};

const RoleCard = ({ role, description, capabilities }: { role: string; description: string; capabilities: string[] }) => (
    <AccordionItem value={role}>
        <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col text-left">
                <h3 className="font-semibold text-lg capitalize">{role.replace('-', ' ')}</h3>
                <p className="text-sm text-muted-foreground font-normal">{description}</p>
            </div>
        </AccordionTrigger>
        <AccordionContent>
            <div className="p-4 bg-muted/50 rounded-md">
                <h4 className="font-medium mb-3">Capacidades Asignadas:</h4>
                <ul className="space-y-2">
                    {capabilities.map((cap, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{cap}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </AccordionContent>
    </AccordionItem>
);

export default function PermissionsPage() {
    const { user } = useAuth();
    
    const visibleRoles = React.useMemo(() => {
        if (user?.role === 'super-admin') {
            return Object.entries(permissionsByRole) as [UserRole, { description: string; capabilities: string[] }][];
        }
        if (user?.role === 'operations' || user?.role === 'admin') {
             return (Object.entries(permissionsByRole) as [UserRole, { description: string; capabilities: string[] }][]).filter(
                ([role]) => ['supervisor', 'worker', 'guardia', 'apr'].includes(role)
            );
        }
        return [];
    }, [user]);

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Permisos y Roles"
                description="Visualiza las capacidades de cada rol en el sistema."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield /> Manifiesto de Capacidades</CardTitle>
                    <CardDescription>
                        Esta es una vista de solo lectura de los permisos base para cada rol. La gestión interactiva se habilitará en una futura actualización.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                       {visibleRoles.map(([role, data]) => (
                           <RoleCard key={role} role={role} description={data.description} capabilities={data.capabilities} />
                       ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
