# Manifiesto de Roles y Permisos

Este documento define la arquitectura de permisos de la plataforma. Cada rol está asociado a un conjunto de capacidades (permissions) que determinan qué acciones puede realizar un usuario.

---

## `super-admin` (Dueño del Imperio)

**Descripción:** Control total sobre toda la plataforma, incluyendo la gestión de suscriptores (inquilinos).

**Capacidades:**
- `tenants:create` - Crear nuevos clientes/empresas.
- `tenants:delete` - Eliminar clientes/empresas.
- `tenants:switch` - Cambiar la vista entre diferentes inquilinos.
- `users:create_any` - Crear usuarios en cualquier inquilino.
- `users:manage_any` - Editar/eliminar usuarios en cualquier inquilino.
- `permissions:assign` - (Futuro) Asignar planes de suscripción.
- **Hereda todas las capacidades de todos los demás roles.**

---

## `admin` (Administrador de App del Inquilino)

**Descripción:** Rol de más alto nivel dentro de un suscriptor. Gestiona usuarios y configuraciones de su empresa.

**Capacidades:**
- `users:create` - Crear nuevos usuarios dentro de su inquilino.
- `users:manage` - Editar/eliminar usuarios de su inquilino.
- `settings:manage` - Gestionar proveedores, categorías y unidades de su inquilino.
- `reports:view_all` - Acceder a todos los reportes y estadísticas de su inquilino.
- **Hereda las capacidades de `operations`, `bodega-admin`, y `apr`.**

---

## `operations` (Administrador de Obra)

**Descripción:** Gestión estratégica de compras, inventario de alto nivel y flujo de adquisiciones.

**Capacidades:**
- `purchase_requests:approve` - Aprobar solicitudes de compra.
- `purchase_requests:reject` - Rechazar solicitudes de compra.
- `lots:manage` - Crear y gestionar lotes de compra.
- `orders:create` - Generar órdenes de compra a partir de lotes.
- `payments:view` - Ver el estado de los pagos a proveedores.
- `stock:add_manual` - Realizar ingresos manuales de stock con justificación.
- `safety:review` - Crear y revisar inspecciones de seguridad.
- `suppliers:manage` - Gestionar proveedores.
- `categories:manage` - Gestionar categorías de materiales.
- `units:manage` - Gestionar unidades de medida.

---

## `bodega-admin` (Jefe de Bodega)

**Descripción:** Responsable del día a día y del flujo de entrada/salida de la bodega.

**Capacidades:**
- `material_requests:approve` - Aprobar solicitudes de materiales (descuenta stock).
- `material_requests:reject` - Rechazar solicitudes de materiales.
- `tools:checkout` - Registrar entrega de herramientas.
- `tools:return` - Registrar devolución de herramientas.
- `catalog:manage` - Crear y editar materiales y herramientas (sin alterar stock).
- `stock:receive_order` - Registrar el ingreso de materiales desde una orden de compra.
- `users:create_workers` - Crear y gestionar perfiles de `worker`, `supervisor`, `guardia`.
- `reports:view_operational` - Ver historiales y reportes de bodega.

---

## `supervisor` (Líder en Terreno)

**Descripción:** Jefe de equipo en obra, solicita los recursos necesarios.

**Capacidades:**
- `material_requests:create` - Crear solicitudes de materiales de la bodega.
- `purchase_requests:create` - Crear solicitudes de compra para materiales sin stock.
- `requests:view_own` - Ver el historial de sus propias solicitudes.
- `catalog:view` - Consultar catálogos de materiales y proveedores.
- `safety:complete_checklist` - Ser asignado y completar checklists de seguridad.

---

## `apr` (Prevencionista de Riesgos)

**Descripción:** Guardián de la seguridad, enfocado en la prevención.

**Capacidades:**
- `safety_templates:manage` - Crear y gestionar plantillas de checklists.
- `safety_checklists:assign` - Asignar checklists a supervisores.
- `safety_checklists:review` - Revisar, aprobar o rechazar checklists completados.
- `safety_inspections:create` - Registrar inspecciones no planificadas.
- `safety_inspections:review` - Revisar y cerrar inspecciones.
- `reports:view_safety` - Acceder a reportes de seguridad.
- **Hereda la capacidad `material_requests:create` y `purchase_requests:create` de `supervisor`.**

---

## `worker` (Colaborador)

**Descripción:** El motor de la obra, utiliza los recursos.

**Capacidades:**
- `tools:view_own` - Ver las herramientas que tiene bajo su responsabilidad.

---

## `guardia` (Control de Acceso)

**Descripción:** Rol especializado en el registro de asistencia.

**Capacidades:**
- `attendance:register` - Acceder al módulo de asistencia para escanear QR de trabajadores.

---

## `finance` (Jefe de Adm. y Finanzas)

**Descripción:** Rol específico para la gestión y visibilidad de pagos.

**Capapacidades:**
- `payments:manage` - Acceder al módulo de "Pagos" para gestionar facturas.
- `payments:register_paid` - Marcar facturas como pagadas.
- `suppliers:view` - Ver información de proveedores.

