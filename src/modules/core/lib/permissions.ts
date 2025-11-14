

import type { UserRole } from "./data";

export type Permission = 
    // High-level module access
    | 'module_warehouse:view'
    | 'module_purchasing:view'
    | 'module_users:view'
    | 'module_subscriptions:view'
    | 'module_safety:view'
    | 'module_attendance:view'
    | 'module_payments:view'
    | 'module_reports:view'
    | 'module_permissions:view'

    // Tools
    | 'tools:create'
    | 'tools:view_all'
    | 'tools:edit'
    | 'tools:delete'
    | 'tools:checkout'
    | 'tools:return'
    | 'tools:view_own'

    // Materials
    | 'materials:create'
    | 'materials:view_all'
    | 'materials:edit'
    | 'materials:delete'
    | 'materials:archive'
    
    // Stock
    | 'stock:add_manual'
    | 'stock:receive_order'

    // Material Requests
    | 'material_requests:create'
    | 'material_requests:approve'
    | 'material_requests:view_own'
    | 'material_requests:view_all'

    // Return Requests
    | 'return_requests:create'
    | 'return_requests:approve'
    | 'return_requests:view_all'

    // Purchase Requests
    | 'purchase_requests:create'
    | 'purchase_requests:approve'
    | 'purchase_requests:view_all'
    | 'purchase_requests:delete'

    // Lots & Orders
    | 'lots:create'
    | 'lots:assign'
    | 'lots:delete'
    | 'orders:create'
    | 'orders:view_all'
    | 'orders:cancel'

    // Users
    | 'users:create'
    | 'users:view'
    | 'users:edit'
    | 'users:delete'
    | 'users:change_password'
    | 'users:print_qr'

    // Config (Suppliers, Categories, Units)
    | 'suppliers:create'
    | 'suppliers:view'
    | 'suppliers:edit'
    | 'suppliers:delete'
    | 'categories:create'
    | 'categories:view'
    | 'categories:edit'
    | 'categories:delete'
    | 'units:create'
    | 'units:view'
    | 'units:delete'

    // Payments
    | 'payments:create'
    | 'payments:view'
    | 'payments:mark_as_paid'
    | 'payments:delete'
    | 'payments:edit'

    // Attendance
    | 'attendance:register' // scan QRs
    | 'attendance:edit'     // edit logs, view reports
    | 'attendance:view'

    // Reports
    | 'reports:view'

    // Safety
    | 'safety_templates:create'
    | 'safety_templates:assign'
    | 'safety_checklists:complete'
    | 'safety_checklists:review'
    | 'safety_inspections:create'
    | 'safety_inspections:complete'
    | 'safety_inspections:review'
    | 'safety_observations:create'
    | 'safety_observations:review'

    // Platform (Super Admin only)
    | 'permissions:manage'
    | 'tenants:create'
    | 'tenants:delete'
    | 'tenants:switch';


export const PERMISSIONS: Record<Permission, { label: string; group: string }> = {
    // Módulos
    'module_warehouse:view': { label: 'Acceder a Bodega', group: 'Acceso a Módulos' },
    'module_purchasing:view': { label: 'Acceder a Compras', group: 'Acceso a Módulos' },
    'module_users:view': { label: 'Acceder a Usuarios', group: 'Acceso a Módulos' },
    'module_subscriptions:view': { label: 'Acceder a Suscripciones', group: 'Plataforma' },
    'module_safety:view': { label: 'Acceder a Prevención', group: 'Acceso a Módulos' },
    'module_attendance:view': { label: 'Acceder a Asistencia', group: 'Acceso a Módulos' },
    'module_payments:view': { label: 'Acceder a Pagos', group: 'Acceso a Módulos' },
    'module_reports:view': { label: 'Acceder a Reportes', group: 'Acceso a Módulos' },
    'module_permissions:view': { label: 'Ver Permisos', group: 'Plataforma' },
    'permissions:manage': { label: 'Gestionar Permisos', group: 'Plataforma' },

    // Herramientas
    'tools:create': { label: 'Crear Herramientas', group: 'Herramientas' },
    'tools:view_all': { label: 'Ver Todas las Herramientas', group: 'Herramientas' },
    'tools:edit': { label: 'Editar Herramientas', group: 'Herramientas' },
    'tools:delete': { label: 'Eliminar Herramientas', group: 'Herramientas' },
    'tools:checkout': { label: 'Entregar Herramientas', group: 'Herramientas' },
    'tools:return': { label: 'Recibir Herramientas', group: 'Herramientas' },
    'tools:view_own': { label: 'Ver Mis Herramientas', group: 'Herramientas' },

    // Materiales y Stock
    'materials:create': { label: 'Crear Materiales', group: 'Materiales y Stock' },
    'materials:view_all': { label: 'Ver Todos los Materiales', group: 'Materiales y Stock' },
    'materials:edit': { label: 'Editar Materiales', group: 'Materiales y Stock' },
    'materials:delete': { label: 'Eliminar Materiales', group: 'Materiales y Stock' },
    'materials:archive': { label: 'Archivar Materiales', group: 'Materiales y Stock' },
    'stock:add_manual': { label: 'Ingresar Stock Manualmente', group: 'Materiales y Stock' },
    'stock:receive_order': { label: 'Recibir Material de Compra', group: 'Materiales y Stock' },


    // Solicitudes Internas
    'material_requests:create': { label: 'Crear Solicitudes de Material', group: 'Solicitudes Internas' },
    'material_requests:approve': { label: 'Aprobar Solicitudes de Material', group: 'Solicitudes Internas' },
    'material_requests:view_own': { label: 'Ver Mis Solicitudes', group: 'Solicitudes Internas' },
    'material_requests:view_all': { label: 'Ver Todas las Solicitudes', group: 'Solicitudes Internas' },

    // Devoluciones
    'return_requests:create': { label: 'Crear Devoluciones', group: 'Devoluciones' },
    'return_requests:approve': { label: 'Aprobar Devoluciones', group: 'Devoluciones' },
    'return_requests:view_all': { label: 'Ver Todas las Devoluciones', group: 'Devoluciones' },

    // Compras
    'purchase_requests:create': { label: 'Crear Solicitudes de Compra', group: 'Compras' },
    'purchase_requests:approve': { label: 'Aprobar Solicitudes de Compra', group: 'Compras' },
    'purchase_requests:view_all': { label: 'Ver Solicitudes de Compra', group: 'Compras' },
    'purchase_requests:delete': { label: 'Eliminar Solicitudes de Compra', group: 'Compras' },
    'lots:create': { label: 'Crear Lotes de Compra', group: 'Compras' },
    'lots:assign': { label: 'Asignar Solicitudes a Lotes', group: 'Compras' },
    'lots:delete': { label: 'Eliminar Lotes', group: 'Compras' },
    'orders:create': { label: 'Generar Órdenes de Compra', group: 'Compras' },
    'orders:view_all': { label: 'Ver Órdenes de Compra', group: 'Compras' },
    'orders:cancel': { label: 'Anular Órdenes de Compra', group: 'Compras' },

    // Usuarios
    'users:create': { label: 'Crear Usuarios', group: 'Usuarios' },
    'users:view': { label: 'Ver Usuarios', group: 'Usuarios' },
    'users:edit': { label: 'Editar Usuarios', group: 'Usuarios' },
    'users:delete': { label: 'Eliminar Usuarios', group: 'Usuarios' },
    'users:change_password': { label: 'Cambiar Contraseña de Otros', group: 'Usuarios' },
    'users:print_qr': { label: 'Imprimir Credenciales', group: 'Usuarios' },

    // Configuración
    'suppliers:create': { label: 'Crear Proveedores', group: 'Configuración' },
    'suppliers:view': { label: 'Ver Proveedores', group: 'Configuración' },
    'suppliers:edit': { label: 'Editar Proveedores', group: 'Configuración' },
    'suppliers:delete': { label: 'Eliminar Proveedores', group: 'Configuración' },
    'categories:create': { label: 'Crear Categorías', group: 'Configuración' },
    'categories:view': { label: 'Ver Categorías', group: 'Configuración' },
    'categories:edit': { label: 'Editar Categorías', group: 'Configuración' },
    'categories:delete': { label: 'Eliminar Categorías', group: 'Configuración' },
    'units:create': { label: 'Crear Unidades', group: 'Configuración' },
    'units:view': { label: 'Ver Unidades', group: 'Configuración' },
    'units:delete': { label: 'Eliminar Unidades', group: 'Configuración' },

    // Pagos
    'payments:create': { label: 'Ingresar Facturas', group: 'Pagos' },
    'payments:view': { label: 'Ver Pagos', group: 'Pagos' },
    'payments:mark_as_paid': { label: 'Marcar Facturas como Pagadas', group: 'Pagos' },
    'payments:delete': { label: 'Eliminar Facturas', group: 'Pagos' },
    'payments:edit': { label: 'Editar Facturas', group: 'Pagos' },

    // Asistencia
    'attendance:register': { label: 'Registrar Asistencia (QR)', group: 'Asistencia' },
    'attendance:edit': { label: 'Editar Registros y Ver Reportes', group: 'Asistencia' },
    'attendance:view': { label: 'Ver Asistencia', group: 'Asistencia' },

    // Reportes
    'reports:view': { label: 'Ver Reportes', group: 'Reportes' },

    // Prevención de Riesgos
    'safety_templates:create': { label: 'Crear Plantillas de Seguridad', group: 'Prevención de Riesgos' },
    'safety_templates:assign': { label: 'Asignar Checklists/Inspecciones', group: 'Prevención de Riesgos' },
    'safety_checklists:complete': { label: 'Completar Mis Checklists', group: 'Prevención de Riesgos' },
    'safety_checklists:review': { label: 'Revisar Checklists de Otros', group: 'Prevención de Riesgos' },
    'safety_inspections:create': { label: 'Crear Inspecciones no Planificadas', group: 'Prevención de Riesgos' },
    'safety_inspections:complete': { label: 'Completar Mis Inspecciones', group: 'Prevención de Riesgos' },
    'safety_inspections:review': { label: 'Revisar Inspecciones de Otros', group: 'Prevención de Riesgos' },
    'safety_observations:create': { label: 'Crear Observaciones de Comportamiento', group: 'Prevención de Riesgos' },
    'safety_observations:review': { label: 'Revisar Observaciones', group: 'Prevención de Riesgos' },

    // Plataforma
    'tenants:create': { label: 'Crear Nuevos Inquilinos', group: 'Plataforma' },
    'tenants:delete': { label: 'Eliminar Inquilinos', group: 'Plataforma' },
    'tenants:switch': { label: 'Cambiar entre Inquilinos', group: 'Plataforma' },
};

const adminPermissions: Permission[] = [
    'module_warehouse:view', 'module_purchasing:view', 'module_users:view', 'module_safety:view', 'module_attendance:view', 'module_payments:view', 'module_reports:view', 'module_permissions:view', 'permissions:manage',
    'tools:create', 'tools:view_all', 'tools:edit', 'tools:delete', 'tools:checkout', 'tools:return',
    'materials:create', 'materials:view_all', 'materials:edit', 'materials:delete', 'materials:archive',
    'stock:add_manual', 'stock:receive_order',
    'material_requests:create', 'material_requests:approve', 'material_requests:view_all', 'material_requests:view_own',
    'return_requests:create', 'return_requests:approve', 'return_requests:view_all',
    'purchase_requests:create', 'purchase_requests:approve', 'purchase_requests:view_all', 'purchase_requests:delete',
    'lots:create', 'lots:assign', 'lots:delete', 'orders:create', 'orders:view_all', 'orders:cancel',
    'users:create', 'users:view', 'users:edit', 'users:delete', 'users:change_password', 'users:print_qr',
    'suppliers:create', 'suppliers:view', 'suppliers:edit', 'suppliers:delete',
    'categories:create', 'categories:view', 'categories:edit', 'categories:delete',
    'units:create', 'units:view', 'units:delete',
    'payments:create', 'payments:view', 'payments:mark_as_paid', 'payments:delete', 'payments:edit',
    'attendance:register', 'attendance:edit', 'attendance:view',
    'reports:view',
    'safety_templates:create', 'safety_templates:assign', 'safety_checklists:review', 'safety_inspections:create', 'safety_inspections:review', 'safety_observations:create', 'safety_observations:review'
];


export const ROLES: Record<UserRole, { description: string; permissions: Permission[] }> = {
    'super-admin': {
        description: 'Super Administrador. Control total sobre toda la plataforma y todos los suscriptores.',
        permissions: Object.keys(PERMISSIONS) as Permission[],
    },
    'admin': {
        description: 'Administrador de la empresa. Gestión completa de la operación, incluyendo permisos y usuarios.',
        permissions: adminPermissions,
    },
    'bodega-admin': {
        description: 'Jefe de Bodega. Responsable del inventario físico y del ciclo de compras básico.',
        permissions: [
            // Módulos
            'module_warehouse:view', 'module_purchasing:view',
            // Bodega
            'material_requests:approve', 'return_requests:approve', 'tools:view_all', 'materials:view_all', 'stock:add_manual', 'units:create', 'categories:create', 'material_requests:create',
            'tools:create', 'tools:edit', 'tools:delete', 'tools:checkout', 'tools:return',
            'materials:create', 'materials:edit', 'materials:delete',
            'stock:receive_order',
            // Compras
            'purchase_requests:create', 'purchase_requests:view_all', 
            'suppliers:create', 'suppliers:view', 'suppliers:edit',
            'categories:view', 'categories:edit', 'categories:create',
        ],
    },
    'operations': {
        description: 'Administrador de Obra. Gestión completa de la operación, incluyendo permisos y usuarios.',
        permissions: adminPermissions,
    },
    'supervisor': {
        description: 'Supervisor. Líder en terreno: solicita materiales, compras y registra devoluciones.',
        permissions: [
            'module_warehouse:view', 'module_safety:view',
            'tools:view_own', 'materials:view_all',
            'material_requests:create', 'material_requests:view_own',
            'purchase_requests:create',
            'return_requests:create',
            'safety_checklists:complete',
            'safety_inspections:complete'
        ],
    },
    'cphs': {
        description: 'Comité Paritario. Realiza checklists e inspecciones de seguridad.',
        permissions: [
            'module_safety:view',
            'module_warehouse:view', // Para ver sus herramientas
            'tools:view_own',
            'safety_templates:create', 'safety_templates:assign',
            'safety_checklists:review', 'safety_checklists:complete',
            'safety_inspections:create', 'safety_inspections:review', 'safety_inspections:complete',
            'safety_observations:create', 'safety_observations:review',
        ]
    },
    'apr': {
        description: 'Prevencionista de Riesgos. Gestiona checklists e inspecciones de seguridad.',
        permissions: [
            'module_safety:view', 'module_warehouse:view', 'reports:view', 'module_reports:view', 'users:view', 'module_users:view',
            'safety_templates:create', 'safety_templates:assign',
            'safety_checklists:review', 'safety_checklists:complete',
            'safety_inspections:create', 'safety_inspections:review', 'safety_inspections:complete',
            'safety_observations:create', 'safety_observations:review',
            'material_requests:create', 'purchase_requests:create', 'return_requests:create',
        ],
    },
    'finance': {
        description: 'Finanzas. Gestiona las facturas y pagos a proveedores.',
        permissions: ['module_payments:view', 'payments:create', 'payments:view', 'payments:mark_as_paid', 'payments:delete', 'payments:edit', 'suppliers:view'],
    },
    'guardia': {
        description: 'Guardia. Rol especializado para registrar la asistencia del personal.',
        permissions: ['module_attendance:view', 'attendance:register'],
    },
    'worker': {
        description: 'Colaborador. Usuario básico que puede ver las herramientas que tiene a su cargo.',
        permissions: ['tools:view_own'],
    },
};

// This represents the subscription plans.
export const PLANS = {
    basic: {
        plan: 'basic',
        features: { basic: true, pro: false, enterprise: false },
        allowedRoles: ['bodega-admin', 'supervisor', 'worker', 'guardia'] as UserRole[],
    },
    professional: {
        plan: 'pro',
        features: { basic: true, pro: true, enterprise: false },
        allowedRoles: ['admin', 'bodega-admin', 'operations', 'supervisor', 'apr', 'finance', 'guardia', 'worker', 'cphs'] as UserRole[],
    },
    enterprise: {
        plan: 'enterprise',
        features: { basic: true, pro: true, enterprise: true },
        allowedRoles: ['super-admin', 'admin', 'bodega-admin', 'operations', 'supervisor', 'apr', 'finance', 'guardia', 'worker', 'cphs'] as UserRole[],
    }
};
