// src/modules/core/lib/permissions.ts

import type { UserRole } from "./data";

export type Permission =
  // High-level module access
  | "module_warehouse:view"
  | "module_purchasing:view"
  | "module_users:view"
  | "module_subscriptions:view"
  | "module_safety:view"
  | "module_attendance:view"
  | "module_payments:view"
  | "module_reports:view"
  | "module_permissions:view"

  // Tools
  | "tools:create"
  | "tools:view_all"
  | "tools:edit"
  | "tools:delete"
  | "tools:checkout"
  | "tools:return"
  | "tools:view_own"

  // Materials
  | "materials:create"
  | "materials:view_all"
  | "materials:edit"
  | "materials:delete"
  | "materials:archive"

  // Stock
  | "stock:add_manual"
  | "stock:receive_order"

  // Material Requests
  | "material_requests:create"
  | "material_requests:approve"
  | "material_requests:view_own"
  | "material_requests:view_all"

  // Return Requests
  | "return_requests:create"
  | "return_requests:approve"
  | "return_requests:view_all"

  // Purchase Requests
  | "purchase_requests:create"
  | "purchase_requests:approve"
  | "purchase_requests:view_all"
  | "purchase_requests:delete"

  // Lots & Orders
  | "lots:create"
  | "lots:assign"
  | "lots:delete"
  | "orders:create"
  | "orders:view_all"
  | "orders:cancel"

  // Users
  | "users:create"
  | "users:view"
  | "users:edit"
  | "users:delete"
  | "users:change_password"
  | "users:print_qr"

  // Config
  | "suppliers:create"
  | "suppliers:view"
  | "suppliers:edit"
  | "suppliers:delete"
  | "categories:create"
  | "categories:view"
  | "categories:edit"
  | "categories:delete"
  | "units:create"
  | "units:view"
  | "units:delete"

  // Payments
  | "payments:create"
  | "payments:view"
  | "payments:mark_as_paid"
  | "payments:delete"
  | "payments:edit"

  // Attendance
  | "attendance:register"
  | "attendance:edit"
  | "attendance:view"

  // Reports
  | "reports:view"

  // Safety
  | "safety_templates:create"
  | "safety_templates:assign"
  | "safety_checklists:complete"
  | "safety_checklists:review"
  | "safety_inspections:create"
  | "safety_inspections:complete"
  | "safety_inspections:review"
  | "safety_observations:create"
  | "safety_observations:review"

  // Platform
  | "permissions:manage"
  | "tenants:create"
  | "tenants:delete"
  | "tenants:switch";

export const PERMISSIONS: Record<Permission, { label: string; group: string }> = {
  "module_warehouse:view": { label: "Acceder a Bodega", group: "Acceso a Módulos" },
  "module_purchasing:view": { label: "Acceder a Compras", group: "Acceso a Módulos" },
  "module_users:view": { label: "Acceder a Usuarios", group: "Acceso a Módulos" },
  "module_subscriptions:view": { label: "Acceder a Suscripciones", group: "Plataforma" },
  "module_safety:view": { label: "Acceder a Prevención", group: "Acceso a Módulos" },
  "module_attendance:view": { label: "Acceder a Asistencia", group: "Acceso a Módulos" },
  "module_payments:view": { label: "Acceder a Pagos", group: "Acceso a Módulos" },
  "module_reports:view": { label: "Acceder a Reportes", group: "Acceso a Módulos" },
  "module_permissions:view": { label: "Ver Permisos", group: "Plataforma" },

  "tools:create": { label: "Crear Herramientas", group: "Herramientas" },
  "tools:view_all": { label: "Ver Todas las Herramientas", group: "Herramientas" },
  "tools:edit": { label: "Editar Herramientas", group: "Herramientas" },
  "tools:delete": { label: "Eliminar Herramientas", group: "Herramientas" },
  "tools:checkout": { label: "Entregar Herramientas", group: "Herramientas" },
  "tools:return": { label: "Recibir Herramientas", group: "Herramientas" },
  "tools:view_own": { label: "Ver Mis Herramientas", group: "Herramientas" },

  "materials:create": { label: "Crear Materiales", group: "Materiales y Stock" },
  "materials:view_all": { label: "Ver Todos los Materiales", group: "Materiales y Stock" },
  "materials:edit": { label: "Editar Materiales", group: "Materiales y Stock" },
  "materials:delete": { label: "Eliminar Materiales", group: "Materiales y Stock" },
  "materials:archive": { label: "Archivar Materiales", group: "Materiales y Stock" },
  "stock:add_manual": { label: "Ingresar Stock Manual", group: "Materiales y Stock" },
  "stock:receive_order": { label: "Recibir Materiales", group: "Materiales y Stock" },

  "material_requests:create": { label: "Crear Solicitudes de Material", group: "Solicitudes Internas" },
  "material_requests:approve": { label: "Aprobar Solicitudes de Material", group: "Solicitudes Internas" },
  "material_requests:view_own": { label: "Ver Mis Solicitudes", group: "Solicitudes Internas" },
  "material_requests:view_all": { label: "Ver Todas las Solicitudes", group: "Solicitudes Internas" },

  "return_requests:create": { label: "Crear Devoluciones", group: "Devoluciones" },
  "return_requests:approve": { label: "Aprobar Devoluciones", group: "Devoluciones" },
  "return_requests:view_all": { label: "Ver Todas las Devoluciones", group: "Devoluciones" },

  "purchase_requests:create": { label: "Crear Solicitudes de Compra", group: "Compras" },
  "purchase_requests:approve": { label: "Aprobar Solicitudes de Compra", group: "Compras" },
  "purchase_requests:view_all": { label: "Ver Solicitudes de Compra", group: "Compras" },
  "purchase_requests:delete": { label: "Eliminar Solicitudes de Compra", group: "Compras" },

  "lots:create": { label: "Crear Lotes", group: "Compras" },
  "lots:assign": { label: "Asignar a Lotes", group: "Compras" },
  "lots:delete": { label: "Eliminar Lotes", group: "Compras" },
  "orders:create": { label: "Generar Órdenes de Compra", group: "Compras" },
  "orders:view_all": { label: "Ver Órdenes de Compra", group: "Compras" },
  "orders:cancel": { label: "Anular Órdenes", group: "Compras" },

  "users:create": { label: "Crear Usuarios", group: "Usuarios" },
  "users:view": { label: "Ver Usuarios", group: "Usuarios" },
  "users:edit": { label: "Editar Usuarios", group: "Usuarios" },
  "users:delete": { label: "Eliminar Usuarios", group: "Usuarios" },
  "users:change_password": { label: "Cambiar Contraseña", group: "Usuarios" },
  "users:print_qr": { label: "Imprimir QR", group: "Usuarios" },

  "suppliers:create": { label: "Crear Proveedores", group: "Configuración" },
  "suppliers:view": { label: "Ver Proveedores", group: "Configuración" },
  "suppliers:edit": { label: "Editar Proveedores", group: "Configuración" },
  "suppliers:delete": { label: "Eliminar Proveedores", group: "Configuración" },
  "categories:create": { label: "Crear Categorías", group: "Configuración" },
  "categories:view": { label: "Ver Categorías", group: "Configuración" },
  "categories:edit": { label: "Editar Categorías", group: "Configuración" },
  "categories:delete": { label: "Eliminar Categorías", group: "Configuración" },
  "units:create": { label: "Crear Unidades", group: "Configuración" },
  "units:view": { label: "Ver Unidades", group: "Configuración" },
  "units:delete": { label: "Eliminar Unidades", group: "Configuración" },

  "payments:create": { label: "Ingresar Facturas", group: "Pagos" },
  "payments:view": { label: "Ver Pagos", group: "Pagos" },
  "payments:mark_as_paid": { label: "Marcar Pagado", group: "Pagos" },
  "payments:delete": { label: "Eliminar Facturas", group: "Pagos" },
  "payments:edit": { label: "Editar Facturas", group: "Pagos" },

  "attendance:register": { label: "Registrar Asistencia", group: "Asistencia" },
  "attendance:edit": { label: "Editar y Ver Reportes", group: "Asistencia" },
  "attendance:view": { label: "Ver Asistencia", group: "Asistencia" },

  "reports:view": { label: "Ver Reportes", group: "Reportes" },

  "safety_templates:create": { label: "Crear Plantillas", group: "Prevención" },
  "safety_templates:assign": { label: "Asignar Checklists", group: "Prevención" },
  "safety_checklists:complete": { label: "Completar Checklists", group: "Prevención" },
  "safety_checklists:review": { label: "Revisar Checklists", group: "Prevención" },
  "safety_inspections:create": { label: "Crear Inspecciones", group: "Prevención" },
  "safety_inspections:complete": { label: "Completar Inspecciones", group: "Prevención" },
  "safety_inspections:review": { label: "Revisar Inspecciones", group: "Prevención" },
  "safety_observations:create": { label: "Crear Observaciones", group: "Prevención" },
  "safety_observations:review": { label: "Revisar Observaciones", group: "Prevención" },

  // Plataforma (solo super-admin)
  "permissions:manage": { label: "Gestionar Permisos", group: "Plataforma" },
  "tenants:create": { label: "Crear Empresas", group: "Plataforma" },
  "tenants:delete": { label: "Eliminar Empresas", group: "Plataforma" },
  "tenants:switch": { label: "Cambiar de Empresa", group: "Plataforma" },
};

const fullPermissions: Permission[] = Object.keys(PERMISSIONS) as Permission[];

export const ROLES: Record<UserRole, { description: string; permissions: Permission[] }> = {
  "super-admin": {
    description: "Control total sobre la plataforma y todos los inquilinos.",
    permissions: fullPermissions,
  },
  admin: {
    description: "Administrador completo de la empresa.",
    permissions: fullPermissions,
  },
  operations: {
    description: "Administrador de Obra. Supervisa compras, solicitudes y operación diaria.",
    permissions: [
      "module_warehouse:view",
      "module_purchasing:view",
      "module_safety:view",
      "module_attendance:view",
      "module_reports:view",

      "purchase_requests:create",
      "purchase_requests:approve",
      "purchase_requests:view_all",

      "lots:create",
      "lots:assign",
      "lots:delete",

      "orders:create",
      "orders:view_all",
      "orders:cancel",

      "material_requests:create",
      "material_requests:approve",
      "material_requests:view_all",

      "return_requests:create",
      "return_requests:approve",

      "materials:view_all",
      "tools:view_all",
      "suppliers:view",
      "suppliers:create",
      "suppliers:edit",

      "users:view",

      "safety_checklists:complete",
      "safety_inspections:complete",
    ],
  },
  "bodega-admin": {
    description: "Jefe de Bodega. Responsable del inventario y recepción de materiales.",
    permissions: [
      "module_warehouse:view",
      "module_purchasing:view",

      "material_requests:approve",
      "return_requests:approve",
      "tools:view_all",
      "materials:view_all",
      "stock:add_manual",
      "stock:receive_order",

      "tools:create",
      "tools:edit",
      "tools:delete",
      "tools:checkout",
      "tools:return",

      "materials:create",
      "materials:edit",
      "materials:delete",

      "purchase_requests:create",
      "purchase_requests:view_all",

      "suppliers:create",
      "suppliers:view",
      "suppliers:edit",

      "categories:view",
      "categories:edit",
      "categories:create",
      "categories:delete",

      "units:create",
      "units:view",
      "units:delete",
    ],
  },
  supervisor: {
    description: "Supervisor. Solicita materiales y gestiona su área.",
    permissions: [
      "module_warehouse:view",
      "module_safety:view",

      "tools:view_own",
      "materials:view_all",

      "material_requests:create",
      "material_requests:view_own",

      "purchase_requests:create",

      "return_requests:create",

      "safety_checklists:complete",
      "safety_inspections:complete",
    ],
  },
  cphs: {
    description: "Comité Paritario de Higiene y Seguridad.",
    permissions: [
      "module_safety:view",
      "module_warehouse:view",

      "tools:view_own",

      "safety_templates:create",
      "safety_templates:assign",
      "safety_checklists:review",
      "safety_checklists:complete",
      "safety_inspections:create",
      "safety_inspections:review",
      "safety_inspections:complete",
      "safety_observations:create",
      "safety_observations:review",
    ],
  },
  apr: {
    description: "Prevencionista de Riesgos.",
    permissions: [
      "module_safety:view",
      "module_warehouse:view",
      "reports:view",
      "module_reports:view",
      "users:view",
      "module_users:view",

      "safety_templates:create",
      "safety_templates:assign",
      "safety_checklists:review",
      "safety_checklists:complete",
      "safety_inspections:create",
      "safety_inspections:review",
      "safety_inspections:complete",
      "safety_observations:create",
      "safety_observations:review",

      "material_requests:create",
      "purchase_requests:create",
      "return_requests:create",
    ],
  },
  finance: {
    description: "Finanzas. Gestiona pagos a proveedores.",
    permissions: [
      "module_payments:view",
      "payments:create",
      "payments:view",
      "payments:mark_as_paid",
      "payments:delete",
      "payments:edit",
      "suppliers:view",
    ],
  },
  guardia: {
    description: "Guardia. Registra asistencia con QR.",
    permissions: ["module_attendance:view", "attendance:register"],
  },
  worker: {
    description: "Colaborador. Solo ve sus herramientas asignadas.",
    permissions: ["tools:view_own"],
  },
};

export const PLANS = {
  basic: {
    plan: "basic",
    features: { basic: true, pro: false, enterprise: false },
    allowedRoles: ["bodega-admin", "supervisor", "worker", "guardia"] as UserRole[],
  },
  professional: {
    plan: "pro",
    features: { basic: true, pro: true, enterprise: false },
    allowedRoles: [
      "admin",
      "bodega-admin",
      "operations",
      "supervisor",
      "apr",
      "finance",
      "guardia",
      "worker",
      "cphs",
    ] as UserRole[],
  },
  enterprise: {
    plan: "enterprise",
    features: { basic: true, pro: true, enterprise: true },
    allowedRoles: [
      "super-admin",
      "admin",
      "bodega-admin",
      "operations",
      "supervisor",
      "apr",
      "finance",
      "guardia",
      "worker",
      "cphs",
    ] as UserRole[],
  },
};