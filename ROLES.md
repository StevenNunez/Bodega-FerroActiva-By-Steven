# Descripción de Roles y Permisos

Este documento detalla las capacidades y responsabilidades de cada rol de usuario dentro de la plataforma de gestión de bodega.

---

### 1. Super Administrador (`super-admin`)

**Visión:** El Dueño del Imperio.

Es el rol de más alto nivel, con control total sobre toda la plataforma y todos los suscriptores (inquilinos). Este rol está diseñado para el propietario de la aplicación (tú, Jaimico).

**Capacidades:**
- **Gestión Multi-Inquilino:** Puede ver y cambiar entre los entornos de todos los suscriptores ("tenants") desde un selector global.
- **Gestión de Suscripciones:** Accede al módulo "Suscripciones" para crear y eliminar clientes de la plataforma.
- **Control Total de Usuarios:** Puede crear, editar y eliminar usuarios de cualquier suscriptor. Es el único que puede crear otros `super-admin` (aunque esta capacidad está ahora deshabilitada en la interfaz para seguridad).
- **Acceso Universal:** Tiene acceso a todas las funcionalidades de todos los demás roles combinados. Puede actuar como Jefe de Bodega, Administrador de Obra, Supervisor o APR en cualquier cuenta de cliente.
- **Configuración Maestra:** Controla todas las configuraciones globales y de cada inquilino.

---

### 2. Administrador de Obra (`operations`)

**Visión:** El Gerente de Proyecto.

Es el rol de más alto nivel *dentro de un suscriptor específico*. Se enfoca en la gestión estratégica de compras, la supervisión de la operación y los ajustes de inventario de alto nivel.

**Capacidades:**
- **Gestión de Compras:** Supervisa y aprueba las "Solicitudes de Compra" generadas por los supervisores.
- **Gestión de Lotes:** Agrupa solicitudes aprobadas en lotes de compra para optimizar la adquisición.
- **Generación de Órdenes:** Crea las "Órdenes de Compra" finales para enviar a los proveedores.
- **Gestión de Pagos:** Tiene acceso al módulo de pagos para ver y gestionar facturas de proveedores.
- **Ajustes de Inventario:** Puede realizar "Ingresos Manuales de Stock" para corregir o añadir inventario con una justificación.
- **Configuración Operativa:** Gestiona proveedores, unidades y categorías.
- **Visibilidad Total (del Inquilino):** Ve todas las solicitudes de su empresa y tiene acceso a los reportes y estadísticas.
- **Seguridad:** Puede crear y revisar inspecciones de seguridad y checklists.

---

### 3. Jefe de Bodega (`admin`)

**Visión:** El Guardián del Inventario.

Es el responsable del día a día de la bodega. Su poder se centra en gestionar el flujo de entrada y salida de bienes, pero **no en alterar las cantidades de inventario directamente**.

**Capacidades:**
- **Gestión de Solicitudes:** Aprueba las "Solicitudes de Materiales" de los supervisores, lo que descuenta automáticamente el stock.
- **Gestión de Herramientas:** Registra la entrega y devolución de herramientas a los trabajadores (Checkout/Return).
- **Gestión de Catálogo:** Puede crear y editar la información de materiales y herramientas, **excepto la cantidad de stock**.
- **Gestión de Usuarios (del Inquilino):** Puede crear y gestionar los perfiles de los usuarios de su empresa (supervisores, trabajadores, etc.).
- **Visibilidad:** Puede ver el historial de movimientos y todas las solicitudes de su empresa.
- **Reportes:** Tiene acceso al módulo de "Estadísticas y Reportes".

---

### 4. Supervisor (`supervisor`)

**Visión:** El Líder en Terreno.

Es el jefe de equipo en la obra. Su función principal es solicitar los recursos necesarios para su gente.

**Capacidades:**
- **Solicitud de Materiales:** Crea solicitudes de materiales que deben ser aprobadas por el Jefe de Bodega (`admin`).
- **Solicitud de Compra:** Crea solicitudes de compra para materiales que no están en stock, las cuales deben ser aprobadas por el Administrador de Obra (`operations`).
- **Consulta:** Puede ver el historial de sus propias solicitudes y consultar catálogos de proveedores y categorías.
- **Seguridad:** Puede ser asignado para completar checklists de seguridad.

---

### 5. Prevencionista de Riesgos (`apr` - APR)

**Visión:** El Guardián de la Seguridad.

Se enfoca exclusivamente en la gestión de la seguridad y prevención de riesgos en la obra.

**Capacidades:**
- **Gestión de Seguridad:** Crea plantillas de checklists, asigna checklists a supervisores, y revisa los checklists completados para aprobarlos o rechazarlos.
- **Inspecciones:** Puede registrar "Inspecciones de Seguridad" no planificadas, asignando tareas correctivas a los responsables.
- **Solicitudes:** Al igual que un supervisor, puede solicitar materiales y compras si es necesario.
- **Reportes:** Tiene acceso al módulo de "Estadísticas y Reportes" para analizar datos relevantes a su área.

---

### 6. Colaborador (`worker`)

**Visión:** El Motor de la Obra.

Es el rol más básico, enfocado en el uso de los recursos.

**Capacidades:**
- **Gestión de Herramientas:** Puede ver qué herramientas tiene actualmente bajo su responsabilidad. Su QR es escaneado por el Jefe de Bodega para el retiro y devolución.

---

### 7. Guardia (`guardia`)

**Visión:** El Controlador de Acceso.

Rol especializado con una única función.

**Capacidades:**
- **Registro de Asistencia:** Accede directamente al módulo de asistencia para escanear los códigos QR de los trabajadores y registrar su entrada y salida.

---

### 8. Jefe de Adm. y Finanzas (`finance`)

**Visión:** El Controlador de Pagos.

Un rol específico con visibilidad sobre las finanzas de los proveedores.

**Capacidades:**
- **Gestión de Pagos:** Accede al módulo de "Pagos" para ver el estado de las facturas, registrar pagos y gestionar los datos de los proveedores. No tiene acceso a la gestión de bodega ni inventario.
