import { UserRole } from './data';

export const PERMISSIONS = {
    // ======== ACCESO A MÓDULOS ========
    'module_warehouse:view': { label: 'Ver Módulo de Bodega', description: 'Permite el acceso al módulo principal de bodega, herramientas y solicitudes.', group: 'Acceso a Módulos' },
    'module_users:view': { label: 'Ver Módulo de Usuarios', description: 'Permite el acceso al módulo de gestión de usuarios.', group: 'Acceso a Módulos' },
    'module_subscriptions:view': { label: 'Ver Módulo de Suscripciones', description: 'Permite el acceso al módulo para gestionar inquilinos.', group: 'Acceso a Módulos' },
    'module_safety:view': { label: 'Ver Módulo de Seguridad', description: 'Permite el acceso al módulo de Prevención de Riesgos.', group: 'Acceso a Módulos' },
    'module_attendance:view': { label: 'Ver Módulo de Asistencia', description: 'Permite el acceso al módulo de control de asistencia.', group: 'Acceso a Módulos' },
    'module_payments:view': { label: 'Ver Módulo de Pagos', description: 'Permite el acceso al módulo de gestión de pagos a proveedores.', group: 'Acceso a Módulos' },
    'module_reports:view': { label: 'Ver Módulo de Reportes', description: 'Permite el acceso al módulo de estadísticas y reportes.', group: 'Acceso a Módulos' },
    'module_permissions:view': { label: 'Ver Módulo de Permisos', description: 'Permite el acceso al módulo para gestionar roles y permisos.', group: 'Acceso a Módulos' },

    // ======== PLATAFORMA / SUPER ADMIN ========
    'tenants:create': { label: 'Crear Suscriptores', description: 'Permite crear nuevas empresas o inquilinos en la plataforma.', group: 'Plataforma' },
    'tenants:delete': { label: 'Eliminar Suscriptores', description: 'Permite eliminar empresas o inquilinos existentes.', group: 'Plataforma' },
    'tenants:switch': { label: 'Cambiar de Suscriptor', description: 'Permite al super-admin ver los datos de un inquilino específico.', group: 'Plataforma' },
    'permissions:manage': { label: 'Gestionar Permisos', description: 'Permite ver y editar los permisos de los roles.', group: 'Plataforma' },

    // ======== USUARIOS ========
    'users:create': { label: 'Crear Usuarios', description: 'Permite crear nuevos usuarios dentro de su propio inquilino.', group: 'Usuarios' },
    'users:view': { label: 'Ver Usuarios', description: 'Permite ver la lista de usuarios del inquilino.', group: 'Usuarios' },
    'users:edit': { label: 'Editar Usuarios', description: 'Permite editar la información de los usuarios del inquilino.', group: 'Usuarios' },
    'users:delete': { label: 'Eliminar Usuarios', description: 'Permite eliminar usuarios del inquilino.', group: 'Usuarios' },
    
    // ======== HERRAMIENTAS ========
    'tools:create': { label: 'Crear Herramientas', description: 'Permite añadir nuevas herramientas al inventario.', group: 'Herramientas' },
    'tools:edit': { label: 'Editar Herramientas', description: 'Permite editar la información de las herramientas.', group: 'Herramientas' },
    'tools:delete': { label: 'Eliminar Herramientas', description: 'Permite eliminar herramientas del inventario.', group: 'Herramientas' },
    'tools:checkout': { label: 'Entregar Herramientas', description: 'Permite registrar la salida de herramientas a un trabajador.', group: 'Herramientas' },
    'tools:return': { label: 'Recibir Herramientas', description: 'Permite registrar la devolución de herramientas.', group: 'Herramientas' },
    'tools:view_own': { label: 'Ver Mis Herramientas', description: 'Permite a un trabajador ver las herramientas que tiene a su cargo.', group: 'Herramientas' },

    // ======== BODEGA Y STOCK ========
    'materials:create': { label: 'Crear Materiales', description: 'Permite añadir nuevos materiales al inventario.', group: 'Bodega' },
    'materials:edit': { label: 'Editar Materiales', description: 'Permite editar la información de los materiales.', group: 'Bodega' },
    'materials:delete': { label: 'Eliminar Materiales', description: 'Permite eliminar materiales del inventario.', group: 'Bodega' },
    'materials:archive': { label: 'Archivar Materiales', description: 'Permite archivar materiales sin stock.', group: 'Bodega' },
    'stock:add_manual': { label: 'Ingreso Manual de Stock', description: 'Permite añadir stock a un material existente con justificación.', group: 'Bodega' },
    'stock:receive_order': { label: 'Recibir Órdenes de Compra', description: 'Permite marcar una solicitud de compra como recibida, creando o actualizando el stock.', group: 'Bodega' },

    // ======== CONFIGURACIÓN DE BODEGA ========
    'units:create': { label: 'Crear Unidades', description: 'Permite crear nuevas unidades de medida.', group: 'Configuración' },
    'units:delete': { label: 'Eliminar Unidades', description: 'Permite eliminar unidades de medida.', group: 'Configuración' },
    'categories:create': { label: 'Crear Categorías', description: 'Permite crear nuevas categorías de materiales.', group: 'Configuración' },
    'categories:edit': { label: 'Editar Categorías', description: 'Permite editar categorías de materiales.', group: 'Configuración' },
    'categories:delete': { label: 'Eliminar Categorías', description: 'Permite eliminar categorías de materiales.', group: 'Configuración' },
    'suppliers:create': { label: 'Crear Proveedores', description: 'Permite añadir nuevos proveedores.', group: 'Configuración' },
    'suppliers:edit': { label: 'Editar Proveedores', description: 'Permite editar proveedores existentes.', group: 'Configuración' },
    'suppliers:delete': { label: 'Eliminar Proveedores', description: 'Permite eliminar proveedores.', group: 'Configuración' },

    // ======== SOLICITUDES ========
    'material_requests:create': { label: 'Crear Solicitudes de Material', description: 'Permite a los usuarios solicitar materiales de la bodega.', group: 'Solicitudes' },
    'material_requests:approve': { label: 'Aprobar Solicitudes de Material', description: 'Permite aprobar solicitudes, descontando el stock.', group: 'Solicitudes' },
    'material_requests:view_all': { label: 'Ver Todas las Solicitudes de Material', description: 'Permite ver todas las solicitudes del inquilino.', group: 'Solicitudes' },
    'purchase_requests:create': { label: 'Crear Solicitudes de Compra', description: 'Permite solicitar la compra de materiales sin stock.', group: 'Solicitudes' },
    'purchase_requests:approve': { label: 'Aprobar Solicitudes de Compra', description: 'Permite aprobar, modificar o rechazar solicitudes de compra.', group: 'Solicitudes' },
    'purchase_requests:delete': { label: 'Eliminar Solicitudes de Compra', description: 'Permite eliminar solicitudes de compra.', group: 'Solicitudes' },
    'purchase_requests:view_all': { label: 'Ver Todas las Solicitudes de Compra', description: 'Permite ver todas las solicitudes de compra del inquilino.', group: 'Solicitudes' },

    // ======== COMPRAS Y ÓRDENES ========
    'lots:create': { label: 'Crear Lotes de Compra', description: 'Permite agrupar solicitudes de compra en lotes.', group: 'Compras' },
    'lots:edit': { label: 'Editar Lotes de Compra', description: 'Permite añadir o quitar solicitudes de un lote.', group: 'Compras' },
    'lots:delete': { label: 'Eliminar Lotes de Compra', description: 'Permite eliminar lotes de compra.', group: 'Compras' },
    'orders:create': { label: 'Crear Órdenes de Compra', description: 'Permite generar una OC a partir de un lote.', group: 'Compras' },
    'orders:cancel': { label: 'Anular Órdenes de Compra', description: 'Permite anular una OC y devolver sus solicitudes al lote.', group: 'Compras' },

    // ======== PAGOS ========
    'payments:create': { label: 'Registrar Facturas', description: 'Permite registrar nuevas facturas de proveedores.', group: 'Pagos' },
    'payments:update': { label: 'Marcar Facturas como Pagadas', description: 'Permite cambiar el estado de una factura a pagada.', group: 'Pagos' },
    'payments:edit': { label: 'Editar Facturas', description: 'Permite editar la información de una factura.', group: 'Pagos' },
    'payments:view': { label: 'Ver Pagos', description: 'Permite acceder al módulo de pagos.', group: 'Pagos' },

    // ======== ASISTENCIA ========
    'attendance:register': { label: 'Registrar Asistencia', description: 'Permite escanear QRs para registrar entradas y salidas.', group: 'Asistencia' },
    'attendance:edit': { label: 'Editar Asistencia', description: 'Permite añadir o modificar registros de asistencia manualmente.', group: 'Asistencia' },
    'attendance:delete': { label: 'Eliminar Asistencia', description: 'Permite eliminar registros de asistencia.', group: 'Asistencia' },

    // ======== SEGURIDAD ========
    'safety_templates:create': { label: 'Crear Plantillas de Checklist', description: 'Permite crear nuevas plantillas de checklist.', group: 'Seguridad' },
    'safety_templates:delete': { label: 'Eliminar Plantillas de Checklist', description: 'Permite eliminar plantillas de checklist.', group: 'Seguridad' },
    'safety_checklists:assign': { label: 'Asignar Checklists', description: 'Permite asignar un checklist a un supervisor.', group: 'Seguridad' },
    'safety_checklists:complete': { label: 'Completar Checklists', description: 'Permite a un supervisor llenar y firmar un checklist.', group: 'Seguridad' },
    'safety_checklists:review': { label: 'Revisar Checklists', description: 'Permite a un APR aprobar o rechazar un checklist completado.', group: 'Seguridad' },
    'safety_checklists:delete': { label: 'Eliminar Checklists Asignados', description: 'Permite eliminar un checklist que ya fue asignado.', group: 'Seguridad' },
    'safety_inspections:create': { label: 'Crear Inspecciones de Seguridad', description: 'Permite registrar una inspección de seguridad no planificada.', group: 'Seguridad' },
    'safety_inspections:complete': { label: 'Resolver Inspecciones', description: 'Permite al responsable de una inspección documentar su cierre.', group: 'Seguridad' },
    'safety_inspections:review': { label: 'Revisar Inspecciones', description: 'Permite al APR aprobar o rechazar el cierre de una inspección.', group: 'Seguridad' },
    'safety_observations:create': { label: 'Crear Observaciones de Conducta', description: 'Permite registrar observaciones de conducta.', group: 'Seguridad' },

    // ======== REPORTES ========
    'reports:view': { label: 'Ver Reportes', description: 'Permite acceder al módulo de reportes y estadísticas.', group: 'Reportes' },
} as const;


export type Permission = keyof typeof PERMISSIONS;

interface RoleConfig {
    description: string;
    capabilities: Permission[];
}

export const ROLES: Record<UserRole, RoleConfig> = {
    'super-admin': {
        description: 'Control total sobre toda la plataforma y todos los suscriptores.',
        capabilities: Object.keys(PERMISSIONS) as Permission[],
    },
    admin: {
        description: 'Rol de más alto nivel dentro de un suscriptor. Gestiona toda la operación de la empresa.',
        capabilities: [
            'module_warehouse:view', 'module_users:view', 'module_safety:view', 'module_attendance:view', 'module_payments:view', 'module_reports:view', 'module_permissions:view',
            'users:create', 'users:view', 'users:edit', 'users:delete',
            'permissions:manage',
            'tools:create', 'tools:edit', 'tools:delete', 'tools:checkout', 'tools:return',
            'materials:create', 'materials:edit', 'materials:delete', 'materials:archive',
            'stock:add_manual', 'stock:receive_order',
            'units:create', 'units:delete',
            'categories:create', 'categories:edit', 'categories:delete',
            'material_requests:create', 'material_requests:approve', 'material_requests:view_all',
            'purchase_requests:create', 'purchase_requests:approve', 'purchase_requests:delete', 'purchase_requests:view_all',
            'lots:create', 'lots:edit', 'lots:delete',
            'orders:create', 'orders:cancel',
            'suppliers:create', 'suppliers:edit', 'suppliers:delete',
            'payments:create', 'payments:update', 'payments:edit', 'payments:view',
            'attendance:register', 'attendance:edit', 'attendance:delete',
            'safety_templates:create', 'safety_templates:delete',
            'safety_checklists:assign', 'safety_checklists:complete', 'safety_checklists:review', 'safety_checklists:delete',
            'safety_inspections:create', 'safety_inspections:complete', 'safety_inspections:review',
            'safety_observations:create',
            'reports:view'
        ],
    },
    'bodega-admin': {
        description: 'Responsable del día a día y del flujo de entrada/salida de la bodega.',
        capabilities: [
            'module_warehouse:view', 'module_users:view',
            'users:create', 'users:view', 'users:edit', 'users:delete',
            'tools:create', 'tools:edit', 'tools:delete', 'tools:checkout', 'tools:return',
            'materials:create', 'materials:edit', 'materials:delete',
            'material_requests:create', 'material_requests:approve', 'material_requests:view_all',
            'reports:view',
        ]
    },
    operations: {
        description: 'Gestión estratégica de compras, inventario y proveedores.',
        capabilities: [
            'module_warehouse:view', 'module_permissions:view', 'module_payments:view', 'module_attendance:view', 'module_safety:view', 'module_reports:view',
            'permissions:manage',
            'stock:add_manual', 'stock:receive_order',
            'units:create', 'units:delete',
            'categories:create', 'categories:edit', 'categories:delete',
            'material_requests:create', 'material_requests:view_all',
            'purchase_requests:create', 'purchase_requests:approve', 'purchase_requests:delete', 'purchase_requests:view_all',
            'lots:create', 'lots:edit', 'lots:delete',
            'orders:create', 'orders:cancel',
            'suppliers:create', 'suppliers:edit', 'suppliers:delete',
            'payments:view', 'payments:create', 'payments:update', 'payments:edit',
            'attendance:edit', 'attendance:delete',
            'safety_checklists:complete', 'safety_inspections:complete',
            'reports:view',
        ]
    },
    supervisor: {
        description: 'Líder en terreno, solicita los recursos necesarios para su gente.',
        capabilities: [
            'module_warehouse:view', 'module_safety:view',
            'material_requests:create',
            'purchase_requests:create',
            'tools:view_own',
            'safety_checklists:complete',
            'safety_inspections:complete',
        ]
    },
    apr: {
        description: 'Guardián de la seguridad, enfocado en la prevención.',
        capabilities: [
            'module_warehouse:view', 'module_safety:view', 'module_reports:view', 'module_users:view',
            'users:create', 'users:view', 'users:edit', 'users:delete',
            'material_requests:create',
            'purchase_requests:create',
            'safety_templates:create', 'safety_templates:delete',
            'safety_checklists:assign', 'safety_checklists:complete', 'safety_checklists:review', 'safety_checklists:delete',
            'safety_inspections:create', 'safety_inspections:complete', 'safety_inspections:review',
            'safety_observations:create',
            'reports:view'
        ]
    },
    worker: {
        description: 'El motor de la obra, utiliza los recursos asignados.',
        capabilities: ['module_warehouse:view', 'tools:view_own']
    },
    guardia: {
        description: 'Rol especializado en el registro de asistencia.',
        capabilities: ['module_attendance:view', 'attendance:register']
    },
    finance: {
        description: 'Rol específico para la gestión de pagos a proveedores.',
        capabilities: ['module_payments:view', 'payments:view', 'payments:create', 'payments:update', 'payments:edit']
    }
};

export const ROLES_DEFAULT = ROLES;

export function getPermissionsForRole(role: UserRole | null): Permission[] {
    if (!role) return [];
    // In a real app, this would fetch from the roles configuration in the database
    // For now, we use the default static config
    return ROLES[role]?.capabilities || [];
};


// Here you would define your subscription plans
export const PLANS = {
    professional: {
        name: 'Profesional',
        description: 'Acceso completo para constructoras que gestionan toda su operación.',
        // Includes all roles by default for FerroActiva
        allowedRoles: Object.keys(ROLES_DEFAULT) as UserRole[],
    },
    basic: {
        name: 'Básico',
        description: 'Funciones esenciales para equipos pequeños.',
        allowedRoles: ['supervisor', 'worker'] as UserRole[],
    }
}
